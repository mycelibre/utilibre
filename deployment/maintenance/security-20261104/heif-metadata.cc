// Small synthetic public-API check, not a large-memory exhaustion test.
// Links the new headers/library; uses only 64 KiB of fictional XMP content.
#include <libheif/heif.h>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

static void ok(heif_error e) {
  if (e.code) std::fprintf(stderr, "HEIF fixture: %s\n", e.message);
  assert(e.code == heif_error_Ok);
}
int main(int argc, char** argv) {
  assert(argc == 3 || argc == 4);
  const std::string expected = "<fictional>" + std::string(65536, 'x') + "</fictional>";
  auto* ctx = heif_context_alloc();
  assert(ctx);
  heif_image_handle* handle = nullptr;
  if (argc == 3) {
  ok(heif_context_read_from_file(ctx, argv[1], nullptr));
  ok(heif_context_get_primary_image_handle(ctx, &handle));
  heif_image* image = nullptr;
  ok(heif_decode_image(handle, &image, heif_colorspace_RGB,
                       heif_chroma_interleaved_RGBA, nullptr));
  heif_image_handle_release(handle);
  heif_context_free(ctx);
  ctx = heif_context_alloc();
  heif_encoder* encoder = nullptr;
  ok(heif_context_get_encoder_for_format(ctx, heif_compression_HEVC, &encoder));
  ok(heif_encoder_set_parameter_string(encoder, "x265:pools", "none"));
  ok(heif_encoder_set_parameter_string(encoder, "x265:frame-threads", "1"));
  ok(heif_context_encode_image(ctx, image, encoder, nullptr, &handle));
  heif_encoder_release(encoder);
  heif_image_release(image);
  ok(heif_context_add_XMP_metadata2(ctx, handle, expected.data(), expected.size(),
                                  heif_metadata_compression_deflate));
  ok(heif_context_write_to_file(ctx, argv[2]));
  heif_image_handle_release(handle);
  }
  heif_context_free(ctx);
#ifdef LEGACY_WRITER
  std::puts("legacy-header XMP fixture written");
#else
  const bool reject = argc == 4 && std::strcmp(argv[3], "reject") == 0;
  for (bool limited : {true, false}) {
    if (reject && limited) continue;
    ctx = heif_context_alloc();
    assert(ctx);
    if (limited) {
      auto* limits = heif_context_get_security_limits(ctx);
      assert(limits);
      limits->max_memory_block_size = 8192;
      limits->max_total_memory = 32768;
    }
    ok(heif_context_read_from_file(ctx, argv[2], nullptr));
    ok(heif_context_get_primary_image_handle(ctx, &handle));
    heif_item_id id = 0;
    assert(heif_image_handle_get_list_of_metadata_block_IDs(handle, "mime", &id, 1) == 1);
    if (limited || reject) {
      assert(heif_image_handle_get_metadata_size(handle, id) == 0);
      const auto error = heif_image_handle_get_metadata(handle, id, nullptr);
      std::fprintf(stderr, "limited metadata: %d/%d %s\n", error.code, error.subcode, error.message);
      assert(error.code != heif_error_Ok);
      assert(error.subcode == (reject ? heif_suberror_Decompression_invalid_data
                                     : heif_suberror_Security_limit_exceeded));
    } else {
      assert(heif_image_handle_get_metadata_size(handle, id) == expected.size());
      std::vector<char> output(expected.size());
      ok(heif_image_handle_get_metadata(handle, id, output.data()));
      assert(std::memcmp(output.data(), expected.data(), expected.size()) == 0);
    }
    heif_image_handle_release(handle);
    heif_context_free(ctx);
  }
  std::puts(reject ? "corrupt compression rejected" :
    "bounded zlib metadata rejected; same valid file and exact metadata pass at default limits");
#endif
}
