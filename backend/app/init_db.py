from app.database import Base, engine
from app.models import user, lesson, associations, organisation

def create_tables():
    Base.metadata.create_all(bind=engine)