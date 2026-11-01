#!/usr/bin/env python3
"""One-shot supervisor. No installs, retries or host/browser flag changes.

Lease v1 (scripts/slipstream_x86_lease.json): task=slipstream-x86-once-74-20261101,
public_base_sha=BASE, source_sha=SOURCE (reviewed runner commit, not this lease's
self-referential checkout commit), expires_at=<UTC ISO8601 Z>,
files=PUBLIC (exact mapping), browser={path:/usr/bin/chromium},
driver={sha256:<installed playwright/driver/package/lib/coreBundle.js hex>},
sources={runner:{path,sha256},safety:{path,sha256}}. Source paths are fixed below.
Do not put credentials or extra fields in the lease. Missing prerequisites fail.
"""
import ctypes
import datetime as dt
import hashlib
import importlib.machinery
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

BASE = '11e83932ecbeb01553a902f432a345004e2ab92f'
SOURCE = 'f6de4b7ff6ee87871e2a0e7e806724e17a2bb8dd'
BRANCH = 'refs/heads/test/slipstream-x86-once-20261101'
TASK = 'slipstream-x86-once-74-20261101'
ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / '.tmp/slipstream-x86-ci-checks/artifacts'
SOURCES = {'runner': 'scripts/test_slipstream_feel_browser.py',
           'safety': 'scripts/test_slipstream_runner_safety.py'}
FLOOR = 2 * 1024**3
DISK_LIMIT = 50 * 1024**2
# path | bytes | SHA256 at BASE. Nineteen runtime files and three license notices.
PUBLIC = {path: {'size': int(size), 'sha256': h} for path, size, h in
          (line.split('|') for line in '''Games/Slipstream Borough/CREDITS.md|1562|b8fc5ed706e172030156df3bc0f70b6f6e7ed23a5a4d46698629ee9e136db78e
Games/Slipstream Borough/clock.js|276|53033b464d449cd6c5961e8d95c2e8601bf744c86bc3d8ae48da2e62050c12ae
Games/Slipstream Borough/core.js|36695|0836faeb87e636763580fc3d44405ea100d7b7c903b577b3ba250f3ca56d5f7f
Games/Slipstream Borough/index.html|8147|ca418708f55f4312439f4d965477bd1966a7243505b39c54b33eb7023f894e53
Games/Slipstream Borough/map.js|2360|dcf78105b10bb2ea7b60c9aec93fb64fee032e072077317b9bd662d605e7cce4
Games/Slipstream Borough/script.js|26325|7389ab9184a83df772aa5ad8bd02b9aec1c253ffb83f0e2fcd1b9a96270ca57f
Games/Slipstream Borough/style.css|7470|9d3750922964cd1b3e70f404116215efe0daa0eb367068be1c90f0ed6b74b970
Games/Slipstream Borough/view.js|36596|40f056b7588133c57c0c1f62388951f0decaf211853b8a537431e611599ccdc7
Games/Slipstream Borough/world.js|3999|8af01aa92d3b9c8bc91b9acccb28079f21477075ba0357c829d0767b90bc7f9d
assets/car-arcade/fleet.js|1981|4ee5fe5474fb0230b03bf3c96aaf64a85628d0120476110b83f2b617fd73198c
assets/car-arcade/models.js|16170|57d65ecb57e545a0cf521106ddaca62edde1edb966f920b35d046c63ca4f00b8
assets/car-arcade/patrol.js|5603|22abc6f28bf6cc18cd9610110dd2ce824120131747c895e68511c348e4ceca74
assets/car-arcade/storage.js|2351|50d7705730d77632ac940cfb2fab6d489eb0b4356681eae6cf01c55501bea7c5
assets/car-arcade/style.css|4782|c860363f9d9fb9e572f9e44f6b7a728786c977ff8582c1578e97a98d32ae7ee8
assets/car-arcade/vendor/three.module.js|1272972|76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495
assets/car-arcade/vendor/BufferGeometryUtils.js|31918|3a6701d824adfe05dc28c09b6c1d64aeab9a183bc3b944d85f15f596e5c6c2b3
assets/car-arcade/vendor/LICENSE|1081|852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d
assets/fonts/bungee/bungee-400-latin.woff2|14344|126eec706b7931682dbcf6c6efc274132c603f181fbf912678e6cfeb341e721b
assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2|17208|d64ba838ef5472bba248620ec4fd8b5aa7cf0db2908e0bb230600caf279ba7bc
assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2|17524|140e2bd25a7315c8a062508391426b0d8c3297400c947b8d847be28f73a199f0
assets/fonts/bungee/OFL.txt|4473|d5787a50dde5be6c6daecab9ed459939b1bc37cff0d0e00257eaf1ec2cf4c16c
assets/fonts/atkinson-hyperlegible/OFL.txt|4352|f32d22b3908fcad2c86a74000614ec22e6a7f66ea7e867e616026a27aebdc143'''.splitlines())}


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def public_path(value):
    require(isinstance(value, str), 'path must be text')
    p = PurePosixPath(value)
    require(not p.is_absolute() and not any(x in value for x in ('\\', ':', '%', '?', '#'))
            and all(x not in ('', '.', '..') and not x.startswith('.') for x in value.split('/'))
            and any(value.startswith(prefix) for prefix in
                    ('Games/Slipstream Borough/', 'assets/car-arcade/', 'assets/fonts/')),
            'unsafe public path')
    return value


def sha(value):
    require(isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value), 'invalid SHA256')
    return value


def context(env):
    expected = {'GITHUB_ACTIONS': 'true', 'GITHUB_RUN_NUMBER': '1', 'GITHUB_RUN_ATTEMPT': '1',
                'GITHUB_ACTOR': 'lzeo2', 'GITHUB_REPOSITORY': 'lzeo2/TestRepoGame',
                'GITHUB_REF': BRANCH, 'GITHUB_EVENT_NAME': 'push'}
    require(all(env.get(k) == v for k, v in expected.items()), 'one-run GitHub context rejected')


def lease_check(lease, env, now=None):
    require(set(lease) == {'task', 'public_base_sha', 'source_sha', 'expires_at', 'files',
                           'browser', 'driver', 'sources'}, 'lease fields rejected')
    require(lease['task'] == TASK and lease['public_base_sha'] == BASE, 'task/base mismatch')
    source = lease['source_sha']
    require(source == SOURCE and re.fullmatch('[0-9a-f]{40}', env.get('GITHUB_SHA', '')),
            'reviewed source/check-out SHA mismatch')
    expiry = dt.datetime.fromisoformat(lease['expires_at'].replace('Z', '+00:00'))
    require(expiry.tzinfo == dt.timezone.utc and
            expiry > (now or dt.datetime.now(dt.timezone.utc)), 'lease expired/non-UTC')
    for path in lease['files']:
        public_path(path)
    require(lease['files'] == PUBLIC, 'exact 19+3 public mapping mismatch')
    require(lease['browser'] == {'path': '/usr/bin/chromium'}, 'browser identity rejected')
    require(set(lease['driver']) == {'sha256'}, 'driver fields rejected')
    sha(lease['driver']['sha256'])
    require(set(lease['sources']) == set(SOURCES), 'source roles rejected')
    for role, path in SOURCES.items():
        entry = lease['sources'][role]
        require(set(entry) == {'path', 'sha256'} and entry['path'] == path, 'source path mismatch')
        sha(entry['sha256'])


def prerequisites(lease):
    require(platform.system() == 'Linux' and platform.machine() == 'x86_64'
            and os.geteuid() != 0, 'requires non-root Linux x86_64')
    require(shutil.disk_usage(ROOT).free >= FLOOR, 'disk below 2 GiB')
    spec = importlib.machinery.PathFinder.find_spec('playwright')
    require(spec is not None and spec.origin, 'PREREQUISITE: Python Playwright is not installed')
    driver = Path(spec.origin).parent / 'driver/package/lib/coreBundle.js'
    require(driver.is_file(), 'PREREQUISITE: installed Playwright coreBundle.js missing')
    require(digest(driver) == lease['driver']['sha256'], 'installed driver hash mismatch')
    browser = Path(lease['browser']['path']).resolve()
    require(browser.is_file() and os.access(browser, os.X_OK), 'PREREQUISITE: browser missing')
    for path in (browser, *browser.parents):
        info = path.stat()
        require(info.st_uid == 0 and not info.st_mode & 0o022, 'system browser path is writable/untrusted')
    with browser.open('rb') as stream:
        require(stream.read(4) == b'\x7fELF', 'system browser is not an ELF')
    return {'coreBundleSha256': digest(driver), 'browserSha256': digest(browser),
            'browserPath': str(browser), 'browserIdentity': 'system image attestation; not pre-certified hardware'}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError('raw redirect forbidden')


def provision(root):
    def expired(*_):
        raise RuntimeError('raw request exceeded 10s')
    signal.signal(signal.SIGALRM, expired)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    total = 0
    deadline = time.monotonic() + 45
    for path, pin in PUBLIC.items():
        public_path(path)
        url = 'https://raw.githubusercontent.com/lzeo2/TestRepoGame/' + BASE + '/' + urllib.parse.quote(path, safe='/')
        destination = root / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        started = time.monotonic()
        size, h = 0, hashlib.sha256()
        signal.setitimer(signal.ITIMER_REAL, 10)
        with opener.open(url, timeout=10) as response, destination.open('xb') as output:
            require(response.status == 200 and response.url == url, 'raw response rejected')
            while True:
                chunk = response.read(65536)
                require(time.monotonic() - started <= 10 and time.monotonic() < deadline,
                        'public provisioning deadline exceeded')
                if not chunk:
                    break
                total += len(chunk)
                size += len(chunk)
                require(total <= 5_000_000 and size <= pin['size'], 'public transfer budget exceeded')
                h.update(chunk)
                output.write(chunk)
        signal.setitimer(signal.ITIMER_REAL, 0)
        require(size == pin['size'] and h.hexdigest() == pin['sha256'], 'public hash/size mismatch')
    return total


def clean_env(home, temporary):
    return {'HOME': str(home), 'TMPDIR': str(temporary), 'PATH': '/usr/bin:/bin',
            'LANG': 'C.UTF-8', 'PYTHONDONTWRITEBYTECODE': '1'}


def processes():
    result = {}
    for path in Path('/proc').glob('[0-9]*/stat'):
        try:
            fields = path.read_text().rsplit(')', 1)[1].split()
            result[int(path.parent.name)] = (int(fields[1]), int(fields[19]))
        except (FileNotFoundError, ProcessLookupError):
            pass
    return result


class Children:
    """Subreaper owns detached descendants; every signal checks PID/starttime."""
    def __init__(self):
        libc = ctypes.CDLL(None, use_errno=True)
        require(libc.prctl(36, 1, 0, 0, 0) == 0, 'cannot enable Linux subreaper')
        self.owned = {}
        self.returncodes = {}
        self.closed = False

    def scan(self):
        table = processes()
        parents = {os.getpid()}
        changed = True
        while changed:
            changed = False
            for pid, (parent, start) in table.items():
                if parent in parents and pid not in parents:
                    self.owned[pid] = start
                    parents.add(pid)
                    changed = True
        return {pid: start for pid, start in self.owned.items()
                if pid in table and table[pid][1] == start}

    def send(self, sig):
        for pid, start in self.scan().items():
            try:
                fd = os.pidfd_open(pid)
            except ProcessLookupError:
                continue
            try:
                current = processes().get(pid)
                if current and current[1] == start:
                    try:
                        signal.pidfd_send_signal(fd, sig)
                    except ProcessLookupError:
                        pass
            finally:
                os.close(fd)

    def reap(self):
        while True:
            try:
                pid, status = os.waitpid(-1, os.WNOHANG)
                if pid == 0:
                    return False
                self.returncodes[pid] = os.waitstatus_to_exitcode(status)
            except ChildProcessError:
                return True

    def close(self, hard_deadline=None):
        self.closed = False
        hard_deadline = hard_deadline or time.monotonic() + 25
        self.send(signal.SIGTERM)
        deadline = hard_deadline - 2
        while time.monotonic() < deadline:
            self.scan()
            empty = self.reap()
            if empty and not self.scan():
                self.closed = True
                return
            time.sleep(.05)
        self.send(signal.SIGKILL)
        while time.monotonic() < hard_deadline:
            self.scan()
            if self.reap() and not self.scan():
                self.closed = True
                return
            time.sleep(.05)
        raise RuntimeError('owned process closure unproven')


def usage(root):
    return sum(p.lstat().st_size for p in root.rglob('*') if not p.is_symlink())


def execute(command, root, env, work, name, children, limit=115):
    started = time.monotonic()
    record = {'startedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'returncode': None,
              'sampleIntervalSeconds': .1, 'measurement': 'sampled owned-work bytes, not a continuous peak guarantee'}
    with (work / (name + '.stdout')).open('wb') as out, (work / (name + '.stderr')).open('wb') as err:
        child = subprocess.Popen(command, cwd=root, env=env, stdin=subprocess.DEVNULL,
                                 stdout=out, stderr=err, start_new_session=True)
        try:
            while child.poll() is None:
                children.scan()
                record['sampledPeakBytes'] = max(record.get('sampledPeakBytes', 0), usage(work))
                require(record['sampledPeakBytes'] <= DISK_LIMIT, 'owned disk/profile exceeded 50MB')
                require(shutil.disk_usage(work).free >= FLOOR, 'disk fell below 2 GiB')
                require(time.monotonic() - started < limit, name + ' external timeout')
                time.sleep(.1)
            record['returncode'] = child.returncode
        finally:
            children.close(started + limit + 25)
            if record['returncode'] is None:
                record['returncode'] = children.returncodes.get(child.pid, child.returncode)
            record['elapsedSeconds'] = round(time.monotonic() - started, 3)
            record['closed'] = children.closed
            (work / (name + '.process.json')).write_text(json.dumps(record))
    require(record['returncode'] == 0, name + ' failed rc=' + str(record['returncode']))
    return record


def sanitize(text, work=None):
    for path, replacement in ((str(ROOT), '<checkout>'), (str(work), '<owned>'),
                               (str(Path.home()), '<home>')):
        if path and path != 'None':
            text = text.replace(path, replacement)
    return re.sub(r'(?i)(token|password|authorization|cookie)([=:]\s*)\S+', r'\1\2<redacted>', text)


def collect(work):
    # Never traverse/copy a browser profile. Only exact harness result names.
    images = []
    for folder in sorted((work / 'tmp').glob('slipstream-feel-*')):
        if folder.is_symlink() or not folder.is_dir():
            continue
        for item in sorted(folder.iterdir()):
            if item.is_symlink() or not item.is_file():
                continue
            if item.suffix == '.jpg':
                images.append(item)
            elif item.name == 'result.json':
                require(item.stat().st_size <= 1_000_000, 'result exceeds artifact budget')
                data = json.loads(item.read_text())
                (ARTIFACTS / (folder.name + '-result.json')).write_text(sanitize(json.dumps(data, indent=2), work))
    require(sum(p.stat().st_size for p in images) <= 300_000, 'JPEG total exceeds 300KB')
    for item in images:
        shutil.copyfile(item, ARTIFACTS / (item.parent.name + '-' + item.name))


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    receipt = {'status': 'FAIL', 'startedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
               'host': {'system': platform.system(), 'machine': platform.machine(),
                        'uid': os.getuid(), 'euid': os.geteuid()},
               'closure': 'no processes started', 'publicBaseSha': BASE,
               'testCommit': os.environ.get('GITHUB_SHA'), 'imageOS': os.environ.get('ImageOS'),
               'imageVersion': os.environ.get('ImageVersion'), 'nativeRunnerInvocations': 0}
    target = ARTIFACTS / 'receipt.json'
    target.write_text(json.dumps(receipt, indent=2))
    work, children = None, None
    try:
        context(os.environ)
        lease = json.loads((ROOT / 'scripts/slipstream_x86_lease.json').read_text())
        lease_check(lease, os.environ)
        receipt['inputs'] = {'public': PUBLIC, 'sources': lease['sources'], 'sourceSha': lease['source_sha']}
        receipt['prerequisites'] = prerequisites(lease)
        children = Children()
        work = Path(tempfile.mkdtemp(prefix='slipstream-x86-', dir=ARTIFACTS.parent))
        root = work / 'serverroot'
        root.mkdir()
        for name in ('home', 'tmp'):
            (work / name).mkdir(mode=0o700)
        env = clean_env(work / 'home', work / 'tmp')
        receipt['provisionedBytes'] = provision(root)
        (root / 'scripts').mkdir()
        for role, path in SOURCES.items():
            source = ROOT / path
            require(not source.is_symlink() and source.is_file(), 'reviewed source missing/symlink')
            require(digest(source) == lease['sources'][role]['sha256'], 'reviewed source hash mismatch')
            shutil.copyfile(source, root / path)
            require(digest(root / path) == lease['sources'][role]['sha256'], 'copied source hash mismatch')
        python = str(Path(sys.executable).resolve())
        receipt['safety'] = execute([python, str(root / SOURCES['safety'])], root, env, work,
                                    'safety', children, limit=20)
        lease_check(lease, os.environ)
        require(not any((work / 'home').iterdir()), 'safety test dirtied native HOME')
        receipt['nativeRunnerInvocations'] = 1  # Source receipt separately proves browser launch.
        receipt['native'] = execute([python, str(root / SOURCES['runner']), '--startup-trace'],
                                    root, env, work, 'native', children)
        results = list((work / 'tmp').glob('slipstream-feel-*/result.json'))
        require(len(results) == 1 and not results[0].is_symlink(), 'one native receipt required')
        native = json.loads(results[0].read_text())
        require(native.get('passed') is True and native.get('serverClosed') is True
                and native.get('sourceUnchanged') is True, 'native result is not PASS')
        receipt['status'] = 'PASS'
    except Exception as error:
        receipt['primaryFailure'] = sanitize(type(error).__name__ + ': ' + str(error), work)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        if children:
            try:
                if children.scan():
                    require(children.closed, 'owned descendants remain after bounded cleanup')
                else:
                    children.closed = children.reap()
                require(children.closed, 'owned process closure unproven')
                receipt['closure'] = {'closed': children.closed, 'pidStarttimes': children.owned}
            except Exception as error:
                receipt['status'] = 'FAIL'
                receipt['closure'] = sanitize(str(error), work)
        if work:
            try:
                collect(work)
                for name in ('safety', 'native'):
                    for suffix in ('stdout', 'stderr', 'process.json'):
                        source = work / (name + '.' + suffix)
                        if source.is_file():
                            require(source.stat().st_size <= 1_000_000, 'log exceeds artifact budget')
                            (ARTIFACTS / source.name).write_text(sanitize(source.read_text(errors='replace'), work))
            except Exception as error:
                receipt['status'] = 'FAIL'
                receipt['artifactFailure'] = sanitize(str(error), work)
        receipt['endedAt'] = dt.datetime.now(dt.timezone.utc).isoformat()
        target.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'status': receipt['status'], 'primaryFailure': receipt.get('primaryFailure'),
                      'receipt': str(target.relative_to(ROOT))}))
    return 0 if receipt['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
