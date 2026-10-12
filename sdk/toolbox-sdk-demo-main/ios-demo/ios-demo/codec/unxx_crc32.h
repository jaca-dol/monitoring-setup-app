#ifndef __CRC32_H__
#define __CRC32_H__

#include <stdio.h>
#include <stdint.h>

extern unsigned int ms_crc32(unsigned char *s, int len);
extern unsigned int ether_crc32(unsigned char *s, int len);
extern unsigned int my_ether_crc32(unsigned int prevalue, unsigned char *s, int len);

#endif

