import json

netscape_file = '/home/user/novo2/cookies_temp.txt'
json_file = '/home/user/novo2/browser-profiles/whisk-automation/cookies.json'

cookies = []
with open(netscape_file, 'r') as f:
    for line in f:
        if line.strip() and not line.startswith('#'):
            parts = line.strip().split('\t')
            if len(parts) == 7:
                domain, flag, path, secure, expiration, name, value = parts
                cookies.append({
                    "domain": domain,
                    "expirationDate": int(expiration),
                    "hostOnly": not domain.startswith('.'),
                    "httpOnly": False,
                    "name": name,
                    "path": path,
                    "sameSite": "no_restriction",
                    "secure": secure == 'TRUE',
                    "session": expiration == '0',
                    "value": value
                })

with open(json_file, 'w') as f:
    json.dump(cookies, f, indent=2)

print(f"Cookies converted from {netscape_file} to {json_file}")
