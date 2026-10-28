/* Safe boundary reproduction: inspect the invalid length, never append to it. */
#include <bson/bson.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
int main(int argc, char **argv) {
 assert(argc == 2);
 const int fixed = strcmp(argv[1], "after") == 0;
 assert(fixed || strcmp(argv[1], "before") == 0);
 for (uint32_t size = 0; size < 5; ++size) {
  bson_t document = BSON_INITIALIZER;
  uint8_t *result = bson_reserve_buffer(&document, size);
  if (fixed) {assert(!result); assert(document.len == 5);}
  else {assert(result); assert(document.len == size);}
  bson_destroy(&document);
 }
 unsigned checks = 0;
 for (unsigned i = 0; i < 8; ++i) {
  bson_t original = BSON_INITIALIZER, restored = BSON_INITIALIZER;
  assert(BSON_APPEND_INT32(&original, "fictional", (int32_t)i));
  assert(BSON_APPEND_UTF8(&original, "label", "Taller ficticio — práctica"));
  const uint32_t length = original.len;
  uint8_t *buffer = bson_reserve_buffer(&restored, length);
  assert(buffer && restored.len == length);
  memcpy(buffer, bson_get_data(&original), length);
  assert(bson_validate(&restored, BSON_VALIDATE_UTF8, NULL));
  assert(bson_equal(&original, &restored));
  bson_destroy(&restored); bson_destroy(&original); ++checks;
 }
 bson_t empty = BSON_INITIALIZER;
 assert(bson_reserve_buffer(&empty, 5));
 assert(bson_validate(&empty, BSON_VALIDATE_NONE, NULL)); ++checks;
 const uint8_t bytes[5] = {5, 0, 0, 0, 0}; bson_t readonly;
 assert(bson_init_static(&readonly, bytes, sizeof bytes));
 assert(!bson_reserve_buffer(&readonly, 6)); ++checks;
 bson_destroy(&readonly); bson_destroy(&empty);
 printf("{\"passed\":true,\"normalChecks\":%u,\"boundaryCases\":5,\"undersizedRejected\":%s}\n", checks, fixed ? "true" : "false");
 return 0;
}
