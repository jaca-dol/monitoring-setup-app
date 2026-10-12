#ifndef __NFC_H__
#define __NFC_H__

//#define USE_IN_STM32
//#include "main.h"
//#include "unp.h"
#include "unxx_params.h"
typedef unsigned int   uint32_t;
typedef unsigned short uint16_t;
typedef unsigned char  uint8_t;

#if defined(LORAWAN_DEVICE)
#include "lorawan.h"
#endif
#define NFC_MAGIC  				0x123456781a2b3c4d
#define NFC_VERSION 			0x01
#define NFC_MAX_TIMEOUT		1000
#define NFC_MAX_LEN       64

typedef enum {
	PN532_WAKE_UP 					= 0x14,
	PN532_WAKE_UP_ACK 			= 0x15,
	PN532_CHECK 						= 0x4a,
	PN532_CHECK_ACK					= 0x4b,
	PN532_SEND							= 0x42,
	PN532_SEND_ACK					=	0x43,
	PN532_SET_FREE					= 0x52,
	PN532_SET_FREE_ACK			= 0x53,
}pn532_type;

typedef enum {
	NFC_SUCCESS 				= 0x00,
	NFC_FAILED					= 0x01,
	NFC_TIMEOUT   			= 0x02,
	NFC_PASSWORD_ERROR 	= 0x03,
}nfc_type;

typedef enum {
	NFC_READ_PKT 	= 0x01,
	NFC_WRITE_PKT	= 0x02,
}nfc_pack_t;

typedef enum {
	NFC_READ_STATUS 		= 0x01,
	NFC_READ_FLASH			= 0x02,
	NFC_READ_PASSWORD 		= 0x03,
	NFC_READ_APPKEY			= 0x04,
	NFC_READ_DEVICE			= 0X05,
	NFC_READ_SDI_DATA       = 0x16,     //SDI 读取控件
	NFC_READ_LORA_TEST		= 0x30,
}nfc_read_pkt;

typedef enum {
	NFC_WRITE_FLASH 					= 0x01,
	NFC_WRITE_POWEN_ON					= 0x02,
	NFC_WRITE_POWEN_OFF 				= 0x03,
	NFC_WRITE_UPGARDE_REQUEST			= 0x04,
	NFC_WRITE_UPGARDE_QUERY 			= 0x05,
	NFC_WRITE_OP_COMPLETE 				= 0x06,
	NFC_WRITE_DEVICE_RESET 				= 0x07,
	NFC_WRITE_PASSWORD 					= 0x08,
	NFC_WRITE_APPKEY 					= 0x09,
	NFC_WRITE_LORA_RELOAD   			= 0X0A,
	NFC_WRITE_DEVICE_RESTART 			= 0X0B,
	NFC_WRITE_TIMESTAMP					= 0X0C,
	NFC_WRITE_CO2_CALIBRATE				= 0x0D,
	NFC_WRITE_SDI_DATA					= 0x21,	//SDI 写入控件
	NFC_WRITE_LORA_TEST					= 0x30,
}nfc_write_pkt;

typedef struct flash_user_params{
  uint8_t status[128];
  uint8_t flash[3712];
  uint32_t crc;
  uint8_t device_type;
  uint8_t device_cmd;
 }flash_user_params_t;//FLASH_USER_PARAMS_SIZE

typedef struct device_msg{
  pn_info_t *pn_msg;
	product_info_t *pro_msg;
	uint8_t *DevEui;
	uint8_t *device_state;
 }device_msg_t;
typedef struct update_time{
		int tm_sec;   /* seconds after the minute, 0 to 60
                     (0 - 60 allows for the occasional leap second) */
    int tm_min;   /* minutes after the hour, 0 to 59 */
    int tm_hour;  /* hours since midnight, 0 to 23 */
    int tm_mday;  /* day of the month, 1 to 31 */
    int tm_mon;   /* months since January, 0 to 11 */
    int tm_year;  /* years since 1900 */
    int tm_wday;
 }update_time_t;
typedef struct status_msg{
  uc11t1_status_t uc11t1_status;
	//value
	uint32_t timpstamp;
	int32_t data[8];
	uc11t1_status_ex_t status_extend;
	uint32_t hide[7];
 }status_msg_t;

extern flash_user_params_t flash_data;
 
extern nfc_type pn532_init(void);
extern nfc_type pn532_check(void);
extern nfc_type pn532_deinit(void);
//read
extern nfc_type nfc_get_status(status_msg_t *status_buf);
extern nfc_type nfc_get_flash(flash_user_params_t * flash_buf);
extern nfc_type nfc_get_sdi(flash_user_params_t * flash_buf, uint16_t *pktsize);
extern nfc_type nfc_get_password(uint8_t * password);
extern nfc_type nfc_get_device(flash_user_params_t * flash_buf, uint16_t *pktsize);

//write
extern nfc_type nfc_set_flash(flash_user_params_t *flash,uint32_t len,uint8_t * password,uint32_t pwd_len);
extern nfc_type nfc_set_sdi(flash_user_params_t *flash,uint32_t len,uint8_t * password,uint32_t pwd_len);
extern nfc_type nfc_set_co2_calibrate(uint8_t * password,uint32_t pwd_len,uint8_t id, uint16_t value);
extern nfc_type nfc_set_power_on(uint8_t * password,uint32_t pwd_len);
extern nfc_type nfc_set_power_off(uint8_t * password,uint32_t pwd_len);
extern nfc_type nfc_set_Upgrade_Request(uint8_t *addr,uint32_t len,uint8_t * password,uint32_t pwd_len);
extern nfc_type nfc_set_Upgrade_Query(void);
extern nfc_type nfc_set_OP_Complete (void);
//extern nfc_type nfc_set_password_auth(uint8_t *password);
extern nfc_type nfc_set_password(uint8_t *old_password,uint8_t* new_password);
extern nfc_type nfc_set_appkey(uint8_t* new_appkey,uint8_t * password,uint32_t pwd_len);
extern nfc_type nfc_set_device_reset(uint8_t * password,uint32_t pwd_len);
extern nfc_type nfc_set_device_time(uint8_t * password,uint32_t pwd_len,uint32_t timestamp);
//uart
extern void nfc_uart_send_data(uint8_t *data, uint16_t pktsize);
extern void nfc_uart_recv_data(uint8_t *data, uint16_t *pktsize);


extern void deal_with_nfc(uint8_t *data);
extern void flash_data_init(flash_user_params_t* data);


#endif
