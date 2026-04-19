from email.mime.text import MIMEText
import smtplib


class EmailService:
    def __init__(
        self,
        smtp_server: str,
        smtp_port: int,
        username: str,
        password: str,
    ):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.username = username
        self.password = password

        if not self.username or not self.password:
            raise ValueError("Email credentials are not set")

    def _connect(self):
        server = smtplib.SMTP(self.smtp_server, self.smtp_port)
        server.starttls()
        server.login(self.username, self.password)
        return server

    def send_text_email(self, to: str, subject: str, body: str):
        msg = MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"] = self.username
        msg["To"] = to

        with self._connect() as server:
            server.send_message(msg)

    def send_html_email(self, to: str, subject: str, html: str):
        msg = MIMEText(html, "html")
        msg["Subject"] = subject
        msg["From"] = self.username
        msg["To"] = to

        with self._connect() as server:
            server.send_message(msg)