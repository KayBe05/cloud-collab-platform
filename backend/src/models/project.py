from dataclasses import dataclass, field
from typing import List
from datetime import datetime
import uuid

@dataclass
class Project:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ''
    owner: str = ''
    collaborators: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    description: str = ''

    def add_collaborator(self, username: str):
        if username not in self.collaborators:
            self.collaborators.append(username)

    def remove_collaborator(self, username: str):
        if username in self.collaborators:
            self.collaborators.remove(username)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'owner': self.owner,
            'collaborators': self.collaborators,
            'created_at': self.created_at.isoformat(),
            'description': self.description
        }
