import re

class Normalizer:
    IP = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
    UUID = re.compile(r"\b[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}\b")
    NUM = re.compile(r"\b\d+\b")
    EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

    def template(self, msg: str) -> str:
        s = msg
        s = self.EMAIL.sub("<EMAIL>", s)
        s = self.UUID.sub("<UUID>", s)
        s = self.IP.sub("<IP>", s)
        s = self.NUM.sub("<NUM>", s)
        return " ".join(s.split())
