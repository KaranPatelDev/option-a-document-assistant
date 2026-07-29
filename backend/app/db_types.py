"""Cross-dialect column types so the same models run against Postgres in
production and SQLite in tests, without needing a live Postgres for CI."""

import json
import uuid

from sqlalchemy import CHAR, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PGUUID


class GUID(TypeDecorator):
    """Platform-independent UUID type. Uses Postgres' native UUID when available,
    otherwise stores as a stringified hex CHAR(32)."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PGUUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            value = uuid.UUID(value)
        return value.hex

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class StringList(TypeDecorator):
    """Stores a list[str] as JSON text — portable across Postgres and SQLite."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        from sqlalchemy import Text

        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return json.dumps([])
        return json.dumps(list(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        return json.loads(value)
