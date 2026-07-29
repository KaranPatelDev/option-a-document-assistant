from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/option_a"
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    cors_origins: str = "http://localhost:3000"
    groq_model: str = "llama-3.3-70b-versatile"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
