"""When a request has ?lang=jp, hide English titles so the frontend
(which falls back to romaji) shows the Japanese/romaji title."""
import json


def _strip_english(node):
    if isinstance(node, dict):
        title = node.get("title")
        if isinstance(title, dict) and "romaji" in title:
            title["english"] = None
        for v in node.values():
            _strip_english(v)
    elif isinstance(node, list):
        for v in node:
            _strip_english(v)


class TitleLanguageMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if (
            request.GET.get("lang") != "jp"
            or not request.path.startswith("/api/anime/")
            or response.status_code != 200
            or "application/json" not in response.get("Content-Type", "")
        ):
            return response
        try:
            data = json.loads(response.content)
        except ValueError:
            return response
        _strip_english(data)
        response.content = json.dumps(data).encode()
        response["Content-Length"] = str(len(response.content))
        return response