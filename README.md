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
Стили и скрипты подключаются корректно только если в `mkdocs.yml` указан **тот же** `site_url`, что и фактический URL сайта после деплоя. Для GitHub Pages (project site) это `https://<user>.github.io/<repo>/` с завершающим слешем. Если деплой идёт на другой домен или подпуть — измените `site_url` под него, иначе тема будет отдавать неверные пути к CSS/JS и страницы откроются без оформления и анимаций.
