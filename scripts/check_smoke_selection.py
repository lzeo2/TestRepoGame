"""Small CLI selector regression; no browser or server is started."""
from smoke_test_games import select_games

games = [{'id': 240, 'title': 'JANKOLOCK'}, {'id': 241, 'title': 'CITISTEN'}]
assert select_games(games, None) == games
assert select_games(games, '241') == games[1:]
assert select_games(games, ' citisten,241 ') == games[1:]
assert select_games(games, '240,CITISTEN') == games
for invalid in ['', '999', '241,999']:
    try:
        select_games(games, invalid)
    except ValueError:
        pass
    else:
        raise AssertionError(f'Unknown selection silently passed: {invalid!r}')
print('SMOKE SELECTOR PASS: IDs/titles select real games; unknown selectors cannot yield a false zero-game pass')
