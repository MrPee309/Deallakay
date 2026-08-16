import os
import logging

logger = logging.getLogger(__name__)

SITE_NAME = "DealLakay"


def _send_via_sendgrid(to: str, subject: str, html: str) -> bool:
    api_key = os.environ.get("SENDGRID_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "").strip()
    if not api_key or not sender:
        return False
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(from_email=sender, to_emails=to, subject=subject, html_content=html)
        sg = SendGridAPIClient(api_key)
        resp = sg.send(message)
        return resp.status_code in (200, 201, 202)
    except Exception as e:
        logger.error(f"SendGrid send failed: {e}")
        return False


def send_verification_email(to: str, name: str, link: str) -> bool:
    subject = f"{SITE_NAME} — Verifye email ou"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
      <div style="background:#0047FF;padding:24px;color:#fff"><h1 style="margin:0;font-size:22px">{SITE_NAME}</h1>
      <p style="margin:4px 0 0;opacity:.9">Achte. Vann. Fè bon Deal.</p></div>
      <div style="padding:28px;color:#0F172A">
        <p>Bonjou {name},</p>
        <p>Mèsi paske ou enskri sou {SITE_NAME}. Klike bouton anba a pou verifye email ou.</p>
        <a href="{link}" style="display:inline-block;background:#FFC800;color:#000;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;margin:12px 0">Verifye Email Mwen</a>
        <p style="color:#64748B;font-size:13px">Oswa kopye lyen sa a: <br>{link}</p>
        <p style="color:#94A3B8;font-size:12px">Lyen sa a ap ekspire nan 24 èdtan.</p>
      </div>
    </div>
    """
    sent = _send_via_sendgrid(to, subject, html)
    if not sent:
        logger.info(f"[EMAIL DEMO] Verification link for {to}: {link}")
    return sent


def send_reset_email(to: str, name: str, link: str) -> bool:
    subject = f"{SITE_NAME} — Reset modpas ou"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
      <div style="background:#0047FF;padding:24px;color:#fff"><h1 style="margin:0;font-size:22px">{SITE_NAME}</h1></div>
      <div style="padding:28px;color:#0F172A">
        <p>Bonjou {name},</p>
        <p>Klike anba a pou chanje modpas ou.</p>
        <a href="{link}" style="display:inline-block;background:#0047FF;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;margin:12px 0">Chanje Modpas</a>
        <p style="color:#64748B;font-size:13px">{link}</p>
      </div>
    </div>
    """
    sent = _send_via_sendgrid(to, subject, html)
    if not sent:
        logger.info(f"[EMAIL DEMO] Reset link for {to}: {link}")
    return sent
