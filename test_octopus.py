from unittest.mock import patch
from app import roll_octopus

def game(level, trials=0):
    return {"name": "t", "guest": False, "level": level, "trials": trials, "status": "playing", "last": None}

def roll(g, value):
    with patch("app.random.random", return_value=value):
        return roll_octopus(g)

g = game(6)
assert roll(g, 0.2) is None and g["level"] == 7 and g["last"] == "success"   # < 0.205
g = game(6)
assert roll(g, 0.96) is None and g["level"] == 5 and g["last"] == "fail"    # < 0.205 + 0.765
g = game(6)
assert roll(g, 0.975) == "run" and g["level"] == 6                           # remaining 3%
g = game(1)
assert roll(g, 0.9999) is None and g["level"] == 2                           # Lv.1 always succeeds
g = game(8)
assert roll(g, 0.01) == "max" and g["level"] == 9
g = game(3, trials=99)
assert roll(g, 0.9) == "exhausted" and g["trials"] == 100 and g["level"] == 2
print("ok")
