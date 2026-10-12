#ifndef __NODE_LZSS_H__
#define __NODE_LZSS_H__

#include <stdbool.h>
#include <stdint.h>

bool Encode(uint8_t *raw, uint16_t raw_size, uint8_t *out, uint16_t *out_size);
bool Decode(uint8_t *raw, uint16_t raw_size, uint8_t *out, uint16_t *out_size);

#endif

