from repositories.log_repository import LogRepository
from utils.time import to_iso_z


class LogQueryService:

    def __init__(self, repository: LogRepository):
        self.repository = repository


    def get_logs(self, cursor: str | None):

        logs = self.repository.get_logs(cursor)

        for log in logs:
            log["event_time"] = to_iso_z(log["event_time"])

        next_cursor = logs[-1]["event_time"] if logs else None

        return logs, next_cursor
    
    
    def get_log_by_id(self, log_id: str):

        log = self.repository.get_log_by_id(log_id)

        log["event_time"] = to_iso_z(log["event_time"])

        if not log:
            return None

        return log
    

    