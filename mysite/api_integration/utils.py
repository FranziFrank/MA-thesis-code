import os
import requests
import urllib3

# Read env var; default to False if not set
DISABLE_SSL_VERIFY = os.getenv("DISABLE_SSL_VERIFY", "False").lower() in ("true", "1", "yes")

if DISABLE_SSL_VERIFY:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def safe_requests_get(url, **kwargs):
    """
    Wrapper for requests.get that disables SSL verification if configured.
    """
    verify = not DISABLE_SSL_VERIFY
    return requests.get(url, verify=verify, **kwargs)
