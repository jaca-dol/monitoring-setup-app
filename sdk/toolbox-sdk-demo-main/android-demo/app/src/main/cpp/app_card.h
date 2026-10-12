#ifndef __APP_CARD_H__
#define __APP_CARD_H__
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include <time.h>
#include <unistd.h>

#pragma pack(1)
typedef union uinfo {
    uint8_t value;
    struct sFields {
        uint8_t version : 4;
        uint8_t key_mode : 2;
        uint8_t ntag_status : 2;
    }Fields;
} uinfo_t;

typedef struct card_header_s {
    uinfo_t info;
    uint8_t reserved0;
    uint8_t reserved1;
    uint8_t reserved2;
    uint16_t size;
    uint8_t reserved3;
    uint8_t sync_flag;
} card_header_t;
#pragma pack()

/**
 * @brief 实现卡模式写功能
 * @param[in] header 头部信息
 * @param[in] data_in 原始数据
 * @param[in] data_in_size 原始数据大小
 * @param[out] data_out 输出的数据
 * @param[out] data_out_size 输出的数据大小
 * @retval 成功返回0，失败返回其它值
*/
int app_card_write(card_header_t *header, uint8_t *data_in, uint16_t data_in_size, uint8_t *data_out, uint16_t data_out_size);

/**
 * @brief 实现卡模式读功能
 * @param[in] header 头部信息
 * @param[in] buf_in 原始数据
 * @param[in] buf_in_size 原始数据大小
 * @param[out] buf_out 输出的数据
 * @param[out] buf_out_size 输出的数据大小
 * @retval 成功返回读到的字节数，失败返回0
*/
int app_card_read(card_header_t *header, uint8_t *buf_in, uint16_t buf_in_size, uint8_t *buf_out, uint16_t buf_out_size);

#endif
