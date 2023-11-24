# Meta-Entitlements

Supabase edge function to brute force entitlement checks for a user.

## Usage

Invoke the function with the following parameters:

### Mandatory:
- `username`: The Oculus/Meta user name to check entitlements for
### Optional:
- `applicationIds`: The Oculus app ids to check entitlements for. If not provided, the function will check entitlements for all apps.
OR
- `range`: The range of entitlements to check. If not provided, the function will check entitlements for all apps.

## Return value

The function will return a JSON object with the following structure:

```json
{
  "applicationsTested": "the number of applications tested",
  "entitlements": "List of app ids for which the user has entitlements",
  "username": "the username",
}
```
