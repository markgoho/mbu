{{- /* Markdown twin of drg/phishing-email.html (mbu#329): the sample
  email as a blockquote, then its six warning signs as a list. Keep the
  text in step with the .html variant. */ -}}
*Anatomy of a phishing email with six numbered warning signs:*

> **From:** SecureBank Alerts (security@s3cure-bank-alerts.com) [1]\
> **To:** you@email.com\
> **Subject:** URGENT: Your account has been compromised!!! [2]
>
> Dear Valued Customer, [3]
>
> We have detected suspicous activity on your account. Your account will be **permanantly suspended** within 24 hours unless you verify your identity immediatley. [4]
>
> Please click the link below to confirm your account information:
>
> https://www.securebank.com/verify (actually goes to: http://s3cure-bank-alerts.com/steal-info) [5]
>
> Failure to respond will result in permanent account closure.
>
> Sincerely,\
> The SecureBank Security Team\
> This email was sent from a no-reply address. Do not respond directly. [6]

Warning signs:

1. **Suspicious sender address**: the display name says "SecureBank" but the actual email is from a different domain.
2. **Urgency and threats**: pressures you to act immediately without thinking.
3. **Generic greeting**: "Dear Valued Customer" instead of your real name.
4. **Spelling errors**: "suspicous," "permanantly," "immediatley." Legitimate companies proofread.
5. **Mismatched link**: the displayed URL looks real but actually goes to a malicious site.
6. **No way to reply**: prevents you from contacting the real organization to verify.
