/*************************************************************************
    > File Name: bmp2hex.h
    > Author: jimmy
    > Mail: 1074833353@qq.com 
    > Created Time: 2021年07月05日 星期一 14时53分11秒
 ************************************************************************/
#ifndef __BMP2HEX_H__
#define __BMP2HEX_H__

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <inttypes.h>

int bitmap_to_hex(const char *raw, unsigned int size, char *out, int *out_size);
int bitmap_to_hex_wt30x(const char *raw, unsigned int raw_size, char *out, int *out_size);

#endif

