import copy
import json
import unittest
from pathlib import Path

from apply import validate_manifest


class ManifestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((Path(__file__).parent / "targets.json").read_text())

    def test_current_manifest_covers_every_enabled_service_id(self):
        manifest = validate_manifest(self.manifest)
        covered = {service for target in manifest["targets"] for service in target["services"]}
        self.assertEqual(len(covered), manifest["enabledServiceCount"])
        self.assertEqual(len(manifest["targets"]), 92)

    def test_rejects_url_tricks_and_duplicate_endpoints(self):
        for url in ("https://utilibre.org.evil/", "https://u:p@utilibre.org/",
                    "https://utilibre.org/?token=1", "http://utilibre.org/"):
            invalid = copy.deepcopy(self.manifest)
            invalid["targets"][0]["url"] = url
            with self.assertRaises(ValueError):
                validate_manifest(invalid)
        invalid = copy.deepcopy(self.manifest)
        invalid["targets"][1]["url"] = invalid["targets"][0]["url"]
        with self.assertRaises(ValueError):
            validate_manifest(invalid)

    def test_rejects_unreviewed_port_and_size(self):
        invalid = copy.deepcopy(self.manifest)
        port = next(target for target in invalid["targets"] if target["type"] == "port")
        port["port"] = 22
        with self.assertRaises(ValueError):
            validate_manifest(invalid)
        invalid = copy.deepcopy(self.manifest)
        invalid["targets"] *= 3
        with self.assertRaises(ValueError):
            validate_manifest(invalid)

    def test_only_reviewed_gothub_replacement_is_allowed(self):
        manifest = validate_manifest(self.manifest)
        gothub = next(target for target in manifest["targets"] if target["id"] == "gothub")
        self.assertEqual(gothub["url"], "https://gothub.utilibre.org/api/v1/version")
        self.assertEqual(gothub["replacesUrl"], "https://gothub.utilibre.org/")
        for field, value in (("replacesUrl", "https://gothub.utilibre.org/other"),
                             ("url", "https://gothub.utilibre.org/"),
                             ("id", "other")):
            invalid = copy.deepcopy(self.manifest)
            item = next(target for target in invalid["targets"] if target["id"] == "gothub")
            item[field] = value
            with self.assertRaises(ValueError):
                validate_manifest(invalid)


if __name__ == "__main__":
    unittest.main()
