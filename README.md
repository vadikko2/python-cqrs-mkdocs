# python-cqrs-mkdocs
Python CQRS [framework](https://github.com/vadikko2/python-cqrs) documentation.

## Development
### Install requirements
```bash
pip install -r ./requirements.txt
```
### Setting pre-commit
```bash
pre-commit install
```

### Run server
```bash
mkdocs serve
```

## Deployment
Стили и скрипты подключаются корректно только если в `mkdocs.yml` указан **тот же** `site_url`, что и фактический URL сайта после деплоя.

- **Timeweb (Docker)** — в репозитории уже задан `site_url: https://mkdocs.python-cqrs.dev/`; сборка через Docker использует его как есть.
- **GitHub Pages** — в CI перед сборкой подставляется `site_url` для `https://vadikko2.github.io/python-cqrs-mkdocs/`.
- Другой домен/подпуть — задайте свой `site_url` в `mkdocs.yml` (с завершающим слешем) или подменяйте его при сборке.
