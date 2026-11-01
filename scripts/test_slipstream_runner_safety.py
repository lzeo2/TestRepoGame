#!/usr/bin/env python3
"""Static/negative launch-policy regression. Never starts a browser or driver."""
import ast
from pathlib import Path
import runpy
import tempfile
from unittest.mock import patch

RUNNER = Path(__file__).with_name('test_slipstream_feel_browser.py')
source = RUNNER.read_text()
policy = runpy.run_path(str(RUNNER))
with tempfile.TemporaryDirectory(prefix='p') as profile:
    options = policy['launch_options'](profile, '/usr/lib/chromium/chromium')
assert options['chromium_sandbox'] is True
assert options['ignore_default_args'] is True
assert options['timeout'] == 20000
policy['check_args'](options['args'], profile)


def rejects(fn, *args):
    try:
        fn(*args)
    except RuntimeError:
        return
    raise AssertionError('Unsafe/unproved launch condition was accepted')


with tempfile.TemporaryDirectory(prefix='p') as owned:
    policy['check_profile'](owned)
    with patch.object(policy['os'], 'geteuid', return_value=policy['os'].geteuid() + 1):
        rejects(policy['check_profile'], owned)
    directory = Path(owned)
    directory.chmod(0o755)
    rejects(policy['check_profile'], owned)
    directory.chmod(0o700)
    link = directory / 'link'
    link.symlink_to(directory, target_is_directory=True)
    rejects(policy['check_profile'], link)
    # Both overlong and multibyte paths must be refused on encoded byte length.
    for name in ['x' * 80, '\u00e9' * 40]:
        long = directory / name
        long.mkdir(mode=0o700)
        rejects(policy['check_profile'], long)
    suffix_bytes = len(b'/.org.chromium.Chromium.XXXXXX/SingletonSocket')
    room = 107 - len(policy['os'].fsencode(directory)) - 1 - suffix_bytes
    assert room > 0, 'Safety-test supervisor TMPDIR itself is too long'
    edge = directory / ('b' * room)
    edge.mkdir(mode=0o700)
    policy['check_profile'](edge)
    over = directory / ('c' * (room + 1))
    over.mkdir(mode=0o700)
    rejects(policy['check_profile'], over)

unsafe = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu-sandbox',
          '--disable-web-security', '--disable-site-isolation-trials',
          '--disable-features=IsolateOrigins,site-per-process', '--single-process',
          '--no-zygote', '--enable-unsafe-swiftshader', '--ignore-certificate-errors',
          '--disable-ipc-flooding-protection', '--disable-client-side-phishing-detection',
          '--unsafely-disable-devtools-self-xss-warnings', '--remote-debugging-port=0',
          '--unknown-future-switch']
for flag in unsafe:
    rejects(policy['check_args'], [*options['args'], flag], profile)
    rejects(policy['check_args'], [flag, *options['args'][1:]], profile)
rejects(policy['check_args'], options['args'][:-1] + ['--user-data-dir=/another-profile'], profile)

# Any alternate launch call or inline options bypassing the checked function fails statically.
tree = ast.parse(source)
launches = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and
            isinstance(n.func, ast.Attribute) and n.func.attr == 'launch']
assert len(launches) == 1
launch = launches[0]
assert not launch.args and len(launch.keywords) == 1 and launch.keywords[0].arg is None
assert isinstance(launch.keywords[0].value, ast.Call)
assert isinstance(launch.keywords[0].value.func, ast.Name)
assert launch.keywords[0].value.func.id == 'launch_options'
assert [n.id for n in launch.keywords[0].value.args] == ['profile', 'executable']
options_fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'launch_options')
assert isinstance(options_fn.body[0], ast.Expr) and isinstance(options_fn.body[0].value, ast.Call)
assert options_fn.body[0].value.func.id == 'check_profile'
assert "TemporaryDirectory(prefix='p')" in source and "prefix='slipstream-chromium-'" not in source
main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
# Evaluate the actual live files expression only; never execute main or launch a driver.
freeze = next(n for n in main.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'files' for t in n.targets))
namespace = dict(policy)
exec(compile(ast.Module(body=[freeze], type_ignores=[]), str(RUNNER), 'exec'), namespace)
required = {'assets/car-arcade/vendor/BufferGeometryUtils.js',
            'assets/fonts/bungee/bungee-400-latin.woff2',
            'assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2',
            'assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2'}
assert required <= {str(p.relative_to(policy['ROOT'])) for p in namespace['files'] if p != RUNNER}, 'Live freeze omits helper/font dependencies'
assert any(isinstance(n, ast.Assign) and isinstance(n.value, ast.Call) and
           isinstance(n.value.func, ast.Name) and n.value.func.id == 'safe_host' for n in main.body)
assert 'signal.alarm(110)' in source and 'page.set_default_timeout(20000)' in source
assert "check_args(argv[1:], profile)" in source and 'check_sandbox(rows)' in source

# All host failures happen before any launch; mocked UID/architecture checks do not run Chromium.
with patch.object(policy['platform'], 'system', return_value='Linux'), \
     patch.object(policy['platform'], 'machine', return_value='x86_64'), \
     patch.object(policy['os'], 'getuid', return_value=1000), \
     patch.object(policy['os'], 'geteuid', return_value=1000), \
     patch.dict(policy['os'].environ, {}, clear=True):
    for uid_method in ['getuid', 'geteuid']:
        with patch.object(policy['os'], uid_method, return_value=0):
            rejects(policy['safe_host'])
    with patch.object(policy['platform'], 'machine', return_value='aarch64'):
        rejects(policy['safe_host'])
    for key in ['CHROMIUM_FLAGS', 'CHROME_FLAGS', 'PW_CHROMIUM_ATTACH_TO_OTHER',
                'SELENIUM_REMOTE_URL', 'NODE_OPTIONS', 'LD_PRELOAD', 'PWDEBUG']:
        with patch.dict(policy['os'].environ, {key:'injected'}):
            rejects(policy['safe_host'])
    with patch.object(policy['hashlib'], 'sha256') as digest:
        digest.return_value.hexdigest.return_value = 'unknown-driver'
        rejects(policy['safe_host'])

rows = ['PID namespaces Yes', 'Network namespaces Yes', 'Seccomp-BPF sandbox Yes']
policy['check_sandbox'](rows)
for i in range(len(rows)):
    rejects(policy['check_sandbox'], rows[:i] + rows[i+1:])
    rejects(policy['check_sandbox'], rows[:i] + [rows[i].replace('Yes', 'No')] + rows[i+1:])
print('PASS sandbox runner policy: 15 unsafe/unknown flags rejected; sole launch uses checked args, all defaults suppressed, sandbox true; root/ARM/environment/unknown-driver/inactive-sandbox fail closed; helper/all3 fonts in actual live freeze; owned non-symlink0700 short profile and107/108-byte socket boundary enforced;20s/110s preserved. No browser/driver started.')
