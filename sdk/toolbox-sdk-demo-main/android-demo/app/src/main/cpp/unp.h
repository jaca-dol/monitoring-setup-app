#ifndef __UNP_H__
#define __UNP_H__

#include <stdint.h>

#define __UC3X52__

#ifdef USE_IN_STM32
#include "usbd_cdc_if.h"
#include "main.h"
#else
typedef unsigned int   uint32_t;
typedef unsigned short uint16_t;
typedef unsigned char  uint8_t;
typedef int   int32_t;
typedef short int16_t;
//typedef char  int8_t;
#endif



#define FLASH_UBL_BASE_ADDR     0x08000000
#if defined(LORAWAN_DEVICE)
#define FLASH_APP_BASE_ADDR     0x08007000    //16KB for ubl
#define FLASH_APP_ENDADDR       (0x08004000 + 0x18400)
#else
#define FLASH_APP_BASE_ADDR     0x08007000    //28KB for ubl
#define FLASH_APP_ENDADDR       (0x08004000 + 0x18400)
#endif

#define UNP_VERSION             0x11
#define UNP_FRAME_FLAG          0x7e
#define UNP_MAX_PKTSIZE         320
#define UNP_MIN_PKTSIZE         16
#define UNP_MAX_TIMEOUT         3000
#define UNP_PASSWD_LEN          6
#define UNP_ONE_TIME_SIZE       128
#define UNP_UPGRADE_CHUNKSIZE   1000
#if defined(LORAWAN_DEVICE)
#define UNP_MSG_MAX_LENGTH      128
#else
#define UNP_MSG_MAX_LENGTH      64
#endif
#define UNP_SCA_MAX_LENGTH      32
#define UNP_PIN_MAX_LENGTH      8
#define UNP_POOR_SIGNAL_VAL     10
#define UNP_PRODUCT_NAME_LEN    8
#define UNP_PRODUCT_ID_LEN      4
#define UNP_PRODUCT_ID_LEN_EM   8
#define UNP_PRODUCT_SN_LEN      12
#define UNP_PRODUCT_SN_LEN2     16
#define UNP_DEVNAME_LEN         0
#define UNP_HWVER_LEN           4
#define UNP_SWVER_LEN           4
#define UNP_SERIES_LEN          4
#define UNP_PN_LEN              4
#define UNP_PN_LEN_EM          	8
#define UNP_PN_NUM              4
#define UNP_PN_V1_NUM           4
#define UNP_PN_V1_LEN           8
#define UNP_SUBMODEL_NUM        4
#define UNP_SUBMODEL_LEN        8
#define UNP_OEM_V1_LEN          4
#define UNP_CUSTOM_LEN          4
#define UNP_REGION_LEN          2
#define UNP_PLMN_MAX_LEN        6
#define UNP_NONCE_LEN           5
#define UNP_APN_MAX_LENGTH      16
#define UNP_MAX_RULES_NUM       4
#define UNP_MAX_RULES_WTS_NUM   4
#define UNP_PN_TOTAL_LEN        (UNP_REGION_LEN + UNP_CUSTOM_LEN + UNP_PN_LEN*UNP_PN_NUM + 4)
#define UNP_REAL_PN_TOTAL_LEN 	(UNP_PN_LEN_EM*UNP_PN_NUM+3)
#define UNP_OEM_LEN             UNP_PN_LEN
#define UNP_REPORT_NUM_MAX_CNT  6
#define UNP_CTRL_NUM_MAX_CNT    2
#define UNP_NUM_MAX_LEN         16
#define UNP_USSD_PREFIX_MAX_LEN 16
#define UNP_MODBUS_NAME_MAX_LEN 16
#define UNP_UPGRADE_FLAG_MAX    32
#define UNP_DTU_REG_PACKET_LEN  32
#define UNP_AI_COLLECT_BUFNUM   5
#define UNP_DTU_SERVER_NUM      2
#define UNP_RESET_REPORT_FLAG   0x55
#define UNP_UPGRADING_FLAG      "unxx upgrading@"
#define UNP_UPGRADE_FAIL_INFO   "upgrade fail"
#define UNP_UPGRADE_SUCC_INFO   "upgrade succ"
#define UNP_UPGRADE_REQUEST     "ursalink image begin@"
#define UNP_UPGRADE_COMPLETE    "ursalink image end@"
#define UNP_STATUS_FLAGS        "@status message@"
#define UNP_STATUS_MESSAGE      UNP_STATUS_FLAGS
#define SUPPORT_UPGRADE_UBOOT   1
#ifdef SUPPORT_UPGRADE_UBOOT
#define UNP_UPGRADE_UBOOT_REQ   "ursalink uboot begin@"
#define UNP_UBOOT_COMPLETE      "ursalink uboot end@"
#endif

#define UNXX_GET_EVENT(X)            (1 << (X))

#define UNXX_MAX_WORKNUM             8
#define UNXX_MAX_CLOCK               UNXX_MAX_WORKNUM
#define UNXX_MAX_MSGNUM              UNXX_MAX_WORKNUM
#define UNXX_MAX_CLOCKNUM            UNXX_MAX_WORKNUM
#ifdef __UC3X52__
#define UNXX_MAX_AI_NUM              2
#define UNXX_MAX_GPIO_NUM            2
#define UNXX_MAX_MODBUS_CHAN         16
#define UNXX_MAX_MODBUS_QUANTITY     1
#elif __UC3X22__
#define UNXX_MAX_AI_NUM              2
#define UNXX_MAX_GPIO_NUM            2
#define UNXX_MAX_MODBUS_CHAN         16
#define UNXX_MAX_MODBUS_QUANTITY     1
#else /*__UC3X14__*/
#define UNXX_MAX_AI_NUM              0
#define UNXX_MAX_GPIO_NUM            2
#define UNXX_MAX_MODBUS_CHAN         0
#define UNXX_MAX_MODBUS_QUANTITY     0
#endif

#define UPGRADE_FLAGS_VALUE           0x55
#define UPGRADE_ONE_TIME_READ_SIZE    256
#define UPGRADE_IMAGE_ADDR            0x7000
#define UPGRADE_IMAGE_SIZE            0x3d800   //246KB

#define UPGRADE_LENGTH_ADDR           (UPGRADE_IMAGE_ADDR + UPGRADE_IMAGE_SIZE)
#define UPGRADE_LENGTH_SIZE           0x04

#define UPGRADE_CRC32_ADDR            (UPGRADE_LENGTH_ADDR + UPGRADE_LENGTH_SIZE)
#define UPGRADE_CRC32_SIZE            0x04

#define UPGRADE_FLAGS_ADDR            (UPGRADE_CRC32_ADDR + UPGRADE_CRC32_SIZE)
#define UPGRADE_FLAGS_SIZE            0x01


typedef enum {
	INPUT_PASSWD_PKT       = 0x01,
	REBOOT_DEVICE_PKT      = 0x02,
	UPGRADE_DEVICE_PKT     = 0x03,
	READ_PARAM_PKT         = 0x04,
	WRITE_PARAM_PKT        = 0x05,
	CONNECT_DEVICE_PKT     = 0x06,
	RESET_DEVICE_PKT       = 0x07,
	DEVICE_CTRL_PKT        = 0x08,
#ifdef SUPPORT_UPGRADE_UBOOT
	UPGRADE_UBOOT_PKT      = 0x09,
#endif
	DEVICE_RELOAD_CONFIG   = 0x10,


	INPUT_PASSWD_ACK_PKT   = 0x81,
	REBOOT_DEVICE_ACK_PKT  = 0x82,
	UPGRADE_DEVICE_ACK_PKT = 0x83,
	READ_PARAM_ACK_PKT     = 0x84,
	WRITE_PARAM_ACK_PKT    = 0x85,
	CONNECT_DEVICE_ACK_PKT = 0x86,
	RESET_DEVICE_ACK_PKT   = 0x87,
	DEVICE_CTRL_ACK_PKT    = 0x88,

#ifdef SUPPORT_UPGRADE_UBOOT
	UPGRADE_UBOOT_ACK_PKT  = 0x89,
#endif
	DEVICE_RELOAD_CONFIG_ACK_PKT    = 0x90,

	DEVICE_COMMON_REPORT_PKT      = 0xf1,
	DEVICE_CHANGE_REPORT_PKT      = 0xf2,
	DEVICE_ATTRIBUTE_REPORT_PKT   = 0xf3,
	DEVICE_REGULAR_REPORT_PKT     = 0xf4,
	DEVICE_PARAMS_REPORT_PKT      = 0xf5,
	DEVICE_DTU_REPORT_PKT         = 0xf6,
	DEVICE_ALARM_REPORT_PKT       = 0xf7,
	DEVICE_INTELLIGENT_REPORT_PKT = 0xf8,
} unp_pack_t;

typedef enum {
	PARAM_IDENTIFICATION         = 0x01,
	PARAM_CONSOLE_CTRL           = 0x02,
	PARAM_CONSOLE_CFG            = 0x03,
	PARAM_DELIMITER              = 0x04,
	PARAM_USER_WORK              = 0x05,
	PARAM_USER_CONFIG            = 0x06,
	PARAM_IO_CONDITION           = 0x07,
	PARAM_IO_ACTION              = 0x08,
	PARAM_MSG_CONDITION          = 0x09,
	PARAM_MSG_ACTION             = 0x0a,
	PARAM_DEVICE_TIME            = 0x0b,
	PARAM_DEVICE_CLOCK           = 0x0c,
	PARAM_GSM_STATUS             = 0x0d,
	PARAM_GSM_SIGNAL             = 0x0e,
	PARAM_INPUT_IO_STATUS        = 0x0f,
	PARAM_OUTPUT_IO_STATUS       = 0x10,
	PARAM_DEVICE_PASSWD          = 0x11,
	PARAM_MOBILE_NET             = 0x12,
	PARAM_MOBILE_SCA             = 0x13,
	PARAM_MOBILE_PIN             = 0x14,
	PARAM_APP_MODE               = 0x15,
	PARAM_USSD_PREFIX            = 0x16,
	PARAM_REPORT_INTERVAL        = 0x17,
	PARAM_SUCC_REPORT            = 0x18,
	PARAM_FAIL_REPORT            = 0x19,
	PARAM_CHANGE_REPORT          = 0x1a,
	PARAM_SMS_DCS                = 0x1b,
	PARAM_REPORT_BY_SMS          = 0x1c,
	PARAM_CTRL_BY_SMS            = 0x1d,
	PARAM_CONTEXT_TYPE           = 0x1e,
	PARAM_REPORT_NUMBER          = 0x1f,
	PARAM_CTRL_NUMBER            = 0x20,
	PARAM_DEVICE_STATUS          = 0x21,
	PARAM_MOBILE_OPERATOR        = 0x22,
	PARAM_AWS_NAME               = 0x23,
	PARAM_AWS_ADDR               = 0x24,
	PARAM_ROOT_CRT               = 0x25,
	PARAM_DEV_CRT                = 0x26,
	PARAM_PRI_KEY                = 0x27,
	PARAM_CLOUD_REPORT_PERIOD    = 0x28,
	PARAM_COLLECT_PERIOD         = 0x29,
	PARAM_OSH                    = 0x2a,
	PARAM_OSL                    = 0x2b,
	PARAM_AI_SETTING             = 0x2c,
	PARAM_AI_VALUE               = 0x2d,
	PARAM_MQTT_KEEPALIVE         = 0x2e,
	PARAM_MODBUS_CHAN_SET        = 0x2f,
	PARAM_MODBUS_GLOBAL_SET      = 0x30,
	PARAM_MODBUS_RULES           = 0x31,
	PARAM_NONCE_VALUE            = 0x32,
	PARAM_APN_SET                = 0x33,
	PARAM_USSD_ACK               = 0x34,
	PARAM_DEVICE_TIMESTAMP       = 0x39,
	PARAM_UNXX_LORAWAN 			 		 = 0x50,
	PARAM_HT_VALUE               = 0x51,
	PARAM_HT_ALARM               = 0x52,
	PARAM_GPIO_CFG               = 0x53,
	PARAM_AI_CHAN_SET            = 0x54,
	PARAM_AI_GLOBAL_SET          = 0x55,
	PARAM_AUTO_REPORT            = 0x56,
	PARAM_MODBUS_VALUE           = 0x57,
	PARAM_3V3_SET                = 0x58,
	PARAM_POWER_ON 					 		 = 0x59,
	PARAM_POWER_OFF		 			 		 = 0x5a,
	PARAM_DEVICE_STATE					 = 0x5b,
	PARAM_ABNORMAL_SET	         = 0x63,
	PARAM_UNP_VERSION            = 0x70,
	PARAM_UNXX_PRODUCTID         = 0x71,
	PARAM_UNXX_SN                = 0x72,
	PARAM_UNXX_HWVER             = 0x73,
	PARAM_UNXX_SWVER             = 0x74,
	PARAM_UNXX_PN                = 0x75,
	PARAM_UNXX_OEM               = 0x76,
	PARAM_UNXX_REAL_PN           = 0X77,
    PARAM_UNXX_SUBSWVER          = 0x7c,
	PARAM_LINKAGE_SWITCH         = 0x84,
} unp_param_t;

typedef enum unp_comnct_e {
	COMNCT_UART,
	COMNCT_USSD,
	COMNCT_DATA,
	COMNCT_SMS,
	COMNCT_URSALINK_CLOUD,
	COMNCT_LORAWAN,
	COMNCT_LORA,
	COMNCT_NFC,
} unp_comnct_t;

typedef enum {
	UNP_SUCCESS = 0,
	UNP_FAIL,
	UNP_FLAG_ERROR,
	UNP_LEN_ERROR,
	UNP_TYPE_ERROR,
	UNP_VERITY_ERROR,
	UNP_TIMEOUT_ERROR,
} unp_state_t;

typedef enum {
	UNP_MOBILE_POWEROFF,
	UNP_MOBILE_NOTREGISTER,
	UNP_MOBILE_REGISTERED,
	UNP_MOBILE_PIN_ERROR,
} unp_mobile_state_t;

typedef struct unp_ack_e {
	unp_pack_t type;
	unp_state_t state;
	uint8_t received;
	uint8_t params[UNP_MAX_PKTSIZE];
	uint16_t params_len;
} unp_ack_t;

typedef enum alarm_mode_e {
	ALARM_NONE = 0,
	ALARM_MODE_BELOW,
	ALARM_MODE_ABOVE,
	ALARM_MODE_WITHIN,
	ALARM_MODE_BELOW_ABOVE,
	ALARM_MODE_SALTATION,
} alarm_mode_t;

typedef struct abnormal_check_set_e{
	uint8_t enable;
	int16_t range;
	uint8_t percentage;
} abnormal_check_set_t;

typedef struct abnormal_check_patch_set_e{
	uint8_t percentage;
	uint8_t retry_count;
	uint8_t retry_interval;
	uint8_t reserved[8];
} abnormal_check_patch_set_t;

typedef struct alarm_rules_e {
	alarm_mode_t mode;
	int16_t max_value;
	int16_t min_value;
	uint16_t continue_time;
	uint16_t lock_time;
	uint8_t enable;
	int16_t max_value2;
	int16_t min_value2;
} alarm_rules_t;

#pragma pack(1)
typedef struct alarm_rules_c {
	uint8_t mode;
	int16_t max_value;
	int16_t min_value;
	uint16_t continue_time;
	uint16_t lock_time;
	uint8_t enable;
	int16_t max_value2;
	int16_t min_value2;
} alarm_rules_custom_t;
#pragma pack()

typedef struct alarm_rules_wts_e {
	uint8_t mode;
	int16_t max_value;
	int16_t min_value;
	uint16_t continue_time;
	uint16_t lock_time;
	uint8_t enable;
	int16_t max_value2;
	int16_t min_value2;
} alarm_rules_wts_t;

typedef enum {
	UNXX_GPIO_RISING = 0,
	UNXX_GPIO_FALLING,
	UNXX_GPIO_RISING_FALLING,
	UNXX_GPIO_TRIGER_HIGH,
	UNXX_GPIO_TRIGER_LOW,
} unxx_gpio_intmode_t;

typedef enum {
	UNXX_GPIO_LOW = 0,
	UNXX_GPIO_HIGH,
	UNXX_GPIO_PWM,
	UNXX_GPIO_FOLLOW,
	UNXX_GPIO_RESERVAL
} unxx_gpio_outmode_t;

typedef enum unxx_aimode_e{
	UNXX_AI_ABOVE,
	UNXX_AI_BELOW,
	UNXX_AI_WITHIN,
} unxx_aimode_t;

typedef enum unxx_mbmode_e{
	UNXX_MB_FALSE = 0,
	UNXX_MB_TRUE,
	UNXX_MB_ABOVE,
	UNXX_MB_BELOW,
	UNXX_MB_WITHIN,
} unxx_mbmode_t;

#define S_DIN_MASK     0x3ff
#define S_ALARM_MASK   0x800
#define S_SIGNAL_MASK  0x1000
#define S_RESTART_MASK 0x2000
#define S_AI_MASK      0xc000
#define S_MB_MASK      0xff0000
typedef enum event_source_e {
	S_IN_IO1_FALLING = 0,
	S_IN_IO1_RISING,
	S_IN_IO1_HIGH,
	S_IN_IO1_LOW,
	S_IN_IO1_CHANGE,
	S_IN_IO2_FALLING,
	S_IN_IO2_RISING,
	S_IN_IO2_HIGH,
	S_IN_IO2_LOW,
	S_IN_IO2_CHANGE,
	S_MSG,
	S_ALARM,
	S_SIGNAL_POOR,
	S_RESTART,
	S_AI1,
	S_AI2,
	S_MODBUS1,
	S_MODBUS2,
	S_MODBUS3,
	S_MODBUS4,
	S_MODBUS5,
	S_MODBUS6,
	S_MODBUS7,
	S_MODBUS8,
} event_source_t;

typedef enum event_dest_e {
	D_OUT_IO1 = 0,
	D_OUT_IO2,
	D_MSG,
	D_RESTART,
	D_CLOUD_ALARM
} event_dest_t;

typedef enum pn1_context_e {
	PN1_GPS = 0,
	PN1_POE,
	PN1_USSD,
	PN1_SMS,
	PN1_CLOUD,
	PN1_WORKNUM,
} pn1_context_t;

typedef enum app_mode_e {
	APP_NONE = 0,
	APP_USSD,
	APP_TCP,
	APP_UDP,
	APP_AWS,
	APP_URSALINK_CLOUD,
	APP_LORAWAN,
} app_mode_t;

typedef enum custom_ocet_e {
	CUSTOM_USSD_ENABLE   = (1 << 15),
	CUSTOM_SMS_ENABLE    = (1 << 14),
	CUSTOM_DATA_ENABLE   = (1 << 13),
	CUSTOM_AWS_ENABLE    = (1 << 12),
	CUSTOM_URUSSD_ENABLE = (1 << 11),
	CUSTOM_URAWS_ENABLE  = (1 << 10),
	CUSTOM_LORA_ENABLE   = (1 << 8),
} custom_ocet_t;

typedef enum context_type_e {
	PLAINTEXT,
	UCP
} context_type_t;

typedef enum sms_dcs_e {
	GSM_7BIT = 0,
	GSM_8BIT = 4,
	GSM_UCS2 = 8
} sms_dcs_t;

typedef enum cellular_network_e {
	CELLULAR_AUTO = 0,
	CELLULAR_4G_FIRST,
	CELLULAR_4G_ONLY,
	CELLULAR_3G_FIRST,
	CELLULAR_3G_ONLY,
	CELLULAR_2G_FIRST,
	CELLULAR_2G_ONLY,
} cellular_network_t;

typedef enum console_id_e {
	CONSOLE_UART_ID = 0,
	RS485_UART_ID,
	RS232_UART_ID,
	UART_SDI_ID,
	UART_MAX_ID
} console_id_t;
#if MOBILE_ENABLE > 0
typedef struct cellular_setting_e {
	cellular_network_t net_type;
	uint8_t sca[UNP_SCA_MAX_LENGTH + 1];
	uint8_t pin[UNP_PIN_MAX_LENGTH + 1];
	uint8_t sms_dcs;
	uint8_t apn[UNP_APN_MAX_LENGTH + 1];
} cellular_setting_t;
#endif
typedef struct ucxx_application_e {
	app_mode_t mode;
	uint8_t change_report;
	uint8_t succ_report;
	uint8_t fail_report;
#if MOBILE_ENABLE > 0
	uint8_t ctrl_by_sms;
	uint8_t report_by_sms;
	uint8_t report_number[UNP_REPORT_NUM_MAX_CNT][UNP_NUM_MAX_LEN];
	uint8_t ctrl_number[UNP_CTRL_NUM_MAX_CNT][UNP_NUM_MAX_LEN];
	uint8_t ussd_prefix[UNP_USSD_PREFIX_MAX_LEN];
#endif
	uint32_t report_interval;
	context_type_t context_type;
	uint32_t cloud_report_interval;
	uint32_t collection_cycle;
	uint32_t mqtt_keep_alive;
} ucxx_application_t;

typedef enum serial_mode_e {
	MODBUS_MASTER = 0,
	DTU,
} serial_mode_t;

typedef enum ai_mode_e {
	CURRENT_MODE = 0,
	VOLTAGE_MODE,
} ai_mode_t;

typedef enum serial_protocol_e {
	SERIAL_TCP = 0,
	SERIAL_UDP
} serial_protocol_t;

typedef enum {
	MB_REG_COIL,
	MB_REG_DIS,
	MB_REG_INPUT,

	MB_REG_HOLD_INT16,
	MB_REG_HOLD_INT32,
	MB_REG_HOLD_FLOAT,

	MB_REG_INPUT_INT32,
	MB_REG_INPUT_FLOAT,

	MB_REG_INPUT_INT32_AB,
	MB_REG_INPUT_INT32_CD,
	MB_REG_HOLD_INT32_AB,
	MB_REG_HOLD_INT32_CD,
} modbus_reg_t;

typedef struct modbus_channel_set_e {
	uint8_t enable;
	uint8_t slaveid;
	uint8_t quantity;
	uint8_t type;
	uint8_t sign;
	uint8_t decimal;
	uint16_t address;
	uint8_t name[UNP_MODBUS_NAME_MAX_LEN];
} modbus_channel_set_t;

typedef struct modbus_global_set_e {
	uint16_t exec_interval;
	uint16_t max_res_time;
	uint16_t retrytimes;
	uint16_t collect_interval;
	uint16_t poweron_time;
	uint8_t pass_through_enable;
	uint8_t pass_through_port;
	uint8_t power_enable;
} modbus_global_set_t;
typedef struct modbus_global_set_e2 {
	uint16_t exec_interval;
	uint16_t max_res_time;
	uint16_t retrytimes;
	uint16_t collect_interval;
	uint16_t poweron_time;
	uint8_t pass_through_enable;
	uint8_t pass_through_port;
	uint8_t power_enable;
    uint16_t v33_pwr_time;
    uint8_t v33_pwr_enable;
    uint8_t v33_pwr_type;
} modbus_global_set_t2;

typedef struct modbus_global_set_v3 {
	uint16_t exec_interval;
	uint16_t max_res_time;
	uint16_t retrytimes;
	uint16_t collect_interval;
	uint16_t poweron_time;
	uint8_t pass_through_enable;
	uint8_t pass_through_port;
	uint8_t power_enable;
    uint16_t v33_pwr_time;
    uint8_t v33_pwr_enable;
    uint8_t v33_pwr_type;
	uint8_t mode;		// 透传模式
} modbus_global_set_v3;

typedef struct modbus_setting_e {
	modbus_global_set_t global;
#if UNXX_MAX_MODBUS_CHAN > 0
	modbus_channel_set_t chan[UNXX_MAX_MODBUS_CHAN];
#endif
} modbus_setting_t;

typedef struct modbus_setting_e2 {
	modbus_global_set_t2 global;
#if UNXX_MAX_MODBUS_CHAN > 0
	modbus_channel_set_t chan[UNXX_MAX_MODBUS_CHAN];
#endif
} modbus_setting_t2;

typedef struct modbus_setting_e3 {
	modbus_global_set_v3 global;
#if UNXX_MAX_MODBUS_CHAN > 0
	modbus_channel_set_t chan[UNXX_MAX_MODBUS_CHAN];
#endif
} modbus_setting_t_v3;

typedef struct ai_global_set_e {
	uint16_t collect_interval;
	uint16_t poweron_time;
	uint8_t power_enable;
} ai_global_set_t;

typedef struct ai_global_set_e2 {
	uint16_t collect_interval;
	uint16_t poweron_time;
	uint8_t power_enable;
    uint16_t v33_pwr_time;
    uint8_t v33_pwr_enable;
    uint8_t v33_pwr_type;
} ai_global_set_t2;

typedef struct ai_channel_set_e {
	uint8_t enable;
	uint8_t mode;
} ai_channel_set_t;

typedef struct ai_settting_e {
	ai_global_set_t global;
	ai_channel_set_t chan[UNXX_MAX_AI_NUM];
} ai_setting_t;

typedef struct ai_settting_e2 {
	ai_global_set_t2 global;
	ai_channel_set_t chan[UNXX_MAX_AI_NUM];
} ai_setting_t2;

typedef enum gpio_type_e {
	GPIO_INPUT = 0,
	GPIO_OUTPUT,
} gpio_type_t;

typedef struct io_setting_e {
	uint8_t enable;
	uint8_t type;
	uint8_t pull;
	uint8_t save_counter;
	uint8_t filter;
} io_setting_t;

struct serial_server_address {
	uint8_t ip[UNP_DTU_SERVER_NUM][5];
	uint16_t port[UNP_DTU_SERVER_NUM];
};

struct serial_app {
	uint8_t mode;
	uint8_t enable;
	uint8_t protocol;
	uint16_t idle_time;
	uint16_t interval_time;
	uint16_t probe_cnt;
	uint16_t bytes_per_frame;
	uint16_t interval_per_frame;
	struct serial_server_address destination;
	uint8_t register_packet[UNP_DTU_REG_PACKET_LEN];
};

struct console_param {
	uint32_t baud;
	uint8_t databits;
	uint8_t stopbits;
	uint8_t parity;
	uint8_t flow;
	struct serial_app app;
};

struct io_trigger_condition {
	unxx_gpio_intmode_t mode;
	uint32_t jitter_time;
	uint32_t lock_time;
};

//#pragma anon_unions
struct io_trigger_action {
#ifdef USE_IN_STM32
	GPIO_PinState powon_value;
#endif
	unxx_gpio_outmode_t mode;
	uint32_t delay_time;
	uint32_t continue_time;
	uint32_t pwm_num;
	uint32_t low_time;
	uint32_t high_time;
};

typedef struct sensor_cfg_s {
        uint8_t enable;
        uint8_t unit;
        uint8_t calibration_enable;
        int16_t calibration_value;
        uint8_t auto_report_enable;
        uint8_t auto_report_diff;
		int16_t calibration_value2;
		uint16_t alarm_value;
		uint8_t alarm_enable;
        int8_t reserved[3];
} sensor_cfg_t;

typedef struct user_config_am {
        sensor_cfg_t Temp;
        sensor_cfg_t Humi;
        sensor_cfg_t Pir;
        sensor_cfg_t Als;
        sensor_cfg_t Co2;
        sensor_cfg_t Dpr;
        sensor_cfg_t Tvoc;
} user_config_t_am;

typedef struct user_config_ws302 {
	sensor_cfg_t Loud;
	sensor_cfg_t Temp;
	sensor_cfg_t Humi;
} user_config_t_ws302;

typedef struct user_config_fp001 {
    sensor_cfg_t CH4;
	sensor_cfg_t Temp;
	sensor_cfg_t Humi;
} user_config_t_fp001;

#pragma pack(1)
typedef struct {
    uint8_t enable;
    uint8_t unit;
    uint8_t calibration_enable;
    int16_t calibration_value;
    uint8_t auto_report_enable;
    uint8_t auto_report_diff;
    int16_t calibration_value2;
    uint16_t alarm_value;
    uint8_t alarm_enable;
    int8_t reserved[3];
} gs301_sensor_cfg_t;

typedef struct {
    gs301_sensor_cfg_t temp;
    gs301_sensor_cfg_t humi;
    gs301_sensor_cfg_t nh3;
    gs301_sensor_cfg_t h2s;
    uint8_t sensor_id[16 + 1 + 16 + 1 + 8 + 1]; // "s0_sn"-"s1_sn"-"version"
} user_config_gs301_t;

typedef struct {
    uint8_t enable;
    uint8_t unit;
    uint8_t calibration_enable;
    int16_t calibration_value;
    uint8_t auto_report_enable;
    uint8_t auto_report_diff;
    int16_t calibration_value2;
    uint16_t alarm_value;
    uint8_t alarm_enable;
    int8_t reserved[3];
} vs330_sensor_cfg_t;

typedef struct {
    vs330_sensor_cfg_t tof;
} user_config_vs330_t;
typedef struct {
        uint8_t enable;
        uint8_t unit;
        uint8_t calibration_enable;
        int16_t calibration_value;
        uint8_t auto_report_enable;
        uint8_t auto_report_diff;
		int16_t calibration_value2;
		uint16_t alarm_value;
		uint8_t alarm_enable;
        int8_t reserved[3];
} am319_sensor_cfg_t;

typedef struct {
    am319_sensor_cfg_t temp;
    am319_sensor_cfg_t humi;
    am319_sensor_cfg_t pir;
    am319_sensor_cfg_t lux;
    am319_sensor_cfg_t co2;
    am319_sensor_cfg_t tvoc;
    am319_sensor_cfg_t pressure;
    am319_sensor_cfg_t pm2_5;
    am319_sensor_cfg_t pm10;
    am319_sensor_cfg_t ch2o;
} user_config_am319_t;

typedef struct {
    uint8_t enable;
    uint8_t unit;
    uint8_t calibration_enable;
    int16_t calibration_value;
    uint8_t auto_report_enable;
    uint8_t auto_report_diff;
    int16_t calibration_value2;
    uint16_t alarm_value;
    uint8_t alarm_enable;
    int8_t reserved[3];
} em400_sensor_cfg_t;

typedef struct {
    em400_sensor_cfg_t distance;
    //em400_sensor_cfg_t temp;
} user_config_em400_t;

typedef struct abnormal_check_set1_s {
    uint8_t enable;
    int16_t range;
    uint8_t percentage;
} abnormal_check_set1_t;

typedef struct abnormal_check_patch_set1_e {
    uint8_t percentage;
    uint8_t retry_count;
    uint8_t retry_interval;
    uint8_t reserved[8];
} abnormal_check_patch_set1_t;

typedef struct tof_config_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint16_t delta;
    uint16_t height;
} tof_config_t;

typedef struct udl_config_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    abnormal_check_set1_t abnormal_check_set;
    abnormal_check_patch_set1_t abnormal_check_patch_set;
    uint16_t delta;
    uint16_t height;
} udl_config_t;

typedef struct tof_application_s {
    uint8_t mode;
    uint8_t enable;
    tof_config_t config[3];
} tof_application_t;

typedef struct udl_application_s {
    uint8_t mode;
    uint8_t enable;
    udl_config_t config[3];
} udl_application_t;

typedef struct application {
    uint8_t linkage_enable;
    tof_application_t tof;
    udl_application_t udl;
} em400_application_t;

typedef struct {
    uint8_t enable;
    uint8_t unit;
    uint8_t calibration_enable;
    int16_t calibration_value;
    uint8_t auto_report_enable;
    uint8_t auto_report_diff;
    int16_t calibration_value2;
    uint16_t alarm_value;
    uint8_t alarm_enable;
    int8_t reserved[3];
} wt101_sensor_cfg_t;

typedef struct wt1101_user_config {
    wt101_sensor_cfg_t sensor_cfg[1];
} wt101_user_config_t;
#pragma pack()

typedef struct user_config {
	sensor_cfg_t sensor_cfg[7];
	ai_setting_t ai;
	modbus_setting_t modbus;
} user_config_t;

typedef struct user_config_uc51x {
    struct solenoid_server_t {
        uint8_t enable;
        uint8_t work_state;         // 工作状态
        uint8_t control_solenoid;   // 控制目标
        uint8_t repeat_cycle;       // 重复周期
        uint8_t start_hour;         // 0~24
        uint8_t start_min;          // 0~59
        uint8_t end_hour;           // 0~24
        uint8_t end_min;            // 0~59
        uint16_t continue_counter;
        uint8_t reserved[6];
    } solenoid_server[16];
} user_config_uc51x_t;


#pragma pack(1)
typedef struct {
    uint32_t start_time;    //起始时间，单位秒UTC格式
    uint16_t continue_time; //持续时间，单位分钟
    uint8_t enable;
    uint8_t rev;
} solenoid_plan_t;            //阀门计划任务
typedef struct user_config_uc51x_rules {
    struct rule_s {
        uint8_t enable;
        // uint8_t wildcard[16+1];  // 通配符
        struct condition_s {
            uint8_t type;                       // 条件类型
            union {
                struct {
                    uint32_t start_time;        // 年月日时分转时间戳
                    uint32_t end_time;          // 年月日时分转时间戳
                    uint8_t cycle_enable;       // 循环使能
                    uint8_t cycle_mode;         // 循环模式 月/日/周日期
                    uint16_t cycle_time;        // 循环周期，周日期时bit0表示星期一
                } time;
                struct {
                    uint8_t cmd[2];             // 命令
                } d2d;
                struct {
                    uint8_t source;             // 数据来源
                    uint16_t time;              // 判断时间 min
                    uint32_t value;             // 判断值
                } pulse_per_time;
                struct {
                    uint8_t source;             // 数据来源
                    uint32_t value;             // 判断值
                } pulse_per_count;
                struct {
                    uint8_t source;                 // 触发来源 0每次变化 or 阀门1开启 or 阀门2开启 or 阀门开启
                    uint8_t mode;                   // 模式 1小于 2大于 3介于 4不介于
                    uint16_t min;                   // 最小值
                    uint16_t max;                   // 最大值
                } pressure_threshold;
            } config;
        } condition[1];
        struct action_s {
            uint8_t type;                       // 目标类型
            union {
                struct {
                    uint8_t target;             // 控制目标
                    uint8_t start_state;        // 开始状态
                    uint8_t time_work;          // 时间任务使能
                    uint32_t continue_time;
                    uint8_t counter_work;       // 计数任务使能
                    uint32_t continue_counter;
                } urgent_task;
                struct {
                    uint8_t target;             // 控制目标
                    uint8_t start_state;        // 开始状态
                    uint8_t time_work;          // 时间任务使能
                    uint32_t continue_time;
                    uint8_t counter_work;       // 计数任务使能
                    uint32_t continue_counter;
                } normal_task;
                struct {
                    uint8_t type;               // 类型
                    uint8_t msg[8+1];           // 消息内容
                    uint8_t continue_count;     // 持续次数
                    uint8_t release_enable;     // 阈值解除使能
                } report;
            } config;
        } action[1];
    } rule[16];

    solenoid_plan_t solenoid_plan[2]; //增加阀门计划任务，按数组索引对应阀门1和阀门2
} user_config_uc51x_rules_t;

typedef struct user_config_uc52x_rules {
    struct {
        uint8_t enable;
        // uint8_t wildcard[16+1];  // 通配符
        struct {
            uint8_t type;                       // 条件类型
            union {
                struct {
                    uint32_t start_time;        // 年月日时分转时间戳
                    uint32_t end_time;          // 年月日时分转时间戳
                    uint8_t cycle_enable;       // 循环使能
                    uint8_t cycle_mode;         // 循环模式 月/日/周日期
                    uint16_t cycle_time;        // 循环周期，周日期时bit0表示星期一
                } time;
                struct {
                    uint8_t cmd[2];             // 命令
                } d2d;
                struct {
                    uint8_t source;             // 数据来源
                    uint16_t time;              // 判断时间 min
                    uint32_t value;             // 判断值
                } pulse_per_time;
                struct {
                    uint8_t source;             // 数据来源
                    uint32_t value;             // 判断值
                } pulse_per_count;
                struct {
                    uint8_t source;                 // 触发来源 0每次变化 or 阀门1开启 or 阀门2开启 or 阀门开启
                    uint8_t mode;                   // 模式 1小于 2大于 3介于 4不介于
                    uint16_t min;                   // 最小值
                    uint16_t max;                   // 最大值
                } pressure_threshold;
            } config;
        } condition[1];
        struct {
            uint8_t type;                       // 目标类型
            union {
                struct {
                    uint8_t target;             // 控制目标
                    uint8_t open_state;        // 开始状态
                    uint8_t time_work;          // 时间任务使能
                    uint32_t continue_time;
                    uint8_t counter_work;       // 计数任务使能
                    uint32_t continue_counter;
                } urgent_task;
                struct {
                    uint8_t target;             // 控制目标
                    uint8_t open_state;        // 开始状态
                    uint8_t time_work;          // 时间任务使能
                    uint32_t continue_time;
                    uint8_t counter_work;       // 计数任务使能
                    uint32_t continue_counter;
                } normal_task;
                struct {
                    uint8_t type;               // 类型
                    uint8_t msg[8+1];           // 消息内容
                    uint8_t continue_count;     // 持续次数
                    uint8_t release_enable;     // 阈值解除使能
                } report;
            } config;
        } action[1];
    } rule[16];
} user_config_uc52x_rules_t;

typedef struct user_config_uc52x_lora_rules {
    struct {
        uint8_t enable;
        // uint8_t wildcard[16+1];  // 通配符
        struct {
            uint8_t type;                       // 条件类型
            union {
                struct {
                    uint32_t start_time;        // 年月日时分转时间戳
                    uint32_t end_time;          // 年月日时分转时间戳
                    uint8_t cycle_enable;       // 循环使能
                    uint8_t cycle_mode;         // 循环模式 月/日/周日期
                    uint16_t cycle_time;        // 循环周期，周日期时bit0表示星期一
                } time;
                struct {
                    uint8_t cmd[2];             // 命令
                } d2d;
                struct {
                    uint8_t source;             // 数据来源
                    uint16_t time;              // 判断时间 min
                    uint32_t value;             // 判断值
                } pulse_per_time;
                struct {
                    uint8_t source;             // 数据来源
                    uint32_t value;             // 判断值
                } pulse_per_count;
                struct {
					uint8_t pressure_source;        // 压力数据来源 1-AI1  2-AI2
                    uint8_t source;                 // 触发来源 0每次变化 or 阀门1开启 or 阀门2开启 or 阀门开启
                    uint8_t mode;                   // 模式 1小于 2大于 3介于 4不介于
                    uint16_t min;                   // 最小值
                    uint16_t max;                   // 最大值
                } pressure_threshold;
            } config;
        } condition[1];
        struct {
            uint8_t type;                       // 目标类型
            union {
                struct {
                    uint8_t target;             // 控制目标
                    uint8_t open_state;        // 开始状态
                    uint8_t time_work;          // 时间任务使能
                    uint32_t continue_time;
                    uint8_t counter_work;       // 计数任务使能
                    uint32_t continue_counter;
                } urgent_task;
                struct {
                    uint8_t target;             // 控制目标
                    uint8_t open_state;        // 开始状态
                    uint8_t time_work;          // 时间任务使能
                    uint32_t continue_time;
                    uint8_t counter_work;       // 计数任务使能
                    uint32_t continue_counter;
                } normal_task;
                struct {
                    uint8_t type;               // 类型
                    uint8_t msg[8+1];           // 消息内容
                    uint8_t continue_count;     // 持续次数
                    uint8_t release_enable;     // 阈值解除使能
                } report;
            } config;
        } action[1];
    } rule[16];
} user_config_uc52x_lora_rules_t;
#pragma pack()

#pragma pack(1)
typedef struct user_config_em310_tilt {
    float calibration[3];
    float zero_offset[3];
    uint8_t reserved;
} user_config_em310_tilt_t;
#pragma pack()

#pragma pack(1)
typedef struct user_config_em320_tilt {
    float calibration[3];
    float zero_offset[3];
    uint8_t reserved;
} user_config_em320_tilt_t;

typedef struct em320_sensor_cfg_s {
        uint8_t enable;
        uint8_t unit;
        uint8_t calibration_enable;
        int16_t calibration_value;
        uint8_t auto_report_enable;
        uint8_t auto_report_diff;
		int16_t calibration_value2;
		uint16_t alarm_value;
		uint8_t alarm_enable;
        int8_t reserved[3];
} em320_sensor_cfg_t;

typedef struct ws203_sensor_params_s {
	uint8_t enable;
	uint8_t unit;
	uint8_t calibration_enable;
	int16_t calibration_value;
	uint8_t auto_report_enable;
	uint8_t auto_report_diff;
	int16_t calibration_value2;
	uint16_t alarm_value;
	uint8_t alarm_enable;
	int8_t reserved[3];
} ws203_sensor_params_t;

typedef struct user_config_ws203_s {
    ws203_sensor_params_t sensor_cfg[2];
} user_config_ws203_t;

typedef struct {
    em320_sensor_cfg_t temp;
    em320_sensor_cfg_t humi;
} user_config_em320_th_t;

typedef struct pulse_unit_conversion_s {
    uint8_t enable;         			// 0:不使能，1:使能 脉冲转换使能
    struct {
        uint16_t conversion_mole;       // 水量
        uint16_t conversion_denom;      // 脉冲
        uint8_t unit[4];                // 脉冲单位
    } pulse_conversion;
} pulse_unit_conversion_t;              // 脉冲单位转换

typedef struct di_cfg_s {
    uint8_t mode;            // 数字输入接口模式 0:关闭，1:电平状态，2:脉冲计数
    struct {
        uint8_t start;       // 0:停止计数,1:开始计数
        uint8_t pulsed_filter;
    } counter;
} di_sensor_cfg_t;
typedef struct {
    em320_sensor_cfg_t temp;
    em320_sensor_cfg_t humi;
	di_sensor_cfg_t di;
	pulse_unit_conversion_t conversion_function; // 脉冲单位转换
} user_config_em300_di_t;

#define CAP_NUM  3
#define CAP_DECIDE_NUM 4

typedef struct {
    int16_t calibration_value[CAP_NUM]; // 标定的电容值 C1，C2，ΔC
    int16_t decide_value[CAP_DECIDE_NUM];      // 缺漏液判定值
    uint16_t starting_up_time;           // 开机后多久进行标定参数
    uint8_t calibration_status;          // 标定标志位
    uint8_t liquid_flag[2];              // 缺液标志位
} user_config_em300_cl_t;

typedef struct  ts101_sensor_cfg_s{
        uint8_t enable;
        uint8_t unit;
        uint8_t calibration_enable;
        int16_t calibration_value;
        uint8_t auto_report_enable;
        uint8_t auto_report_diff;
		int16_t calibration_value2;
		uint16_t alarm_value;
		uint8_t alarm_enable;
        int8_t reserved[3];
} ts101_sensor_cfg_t;

typedef struct {
    ts101_sensor_cfg_t temp;
} user_config_ts101_t;

typedef struct  ts201_sensor_cfg_s{
    uint8_t enable;
    uint8_t unit;       //0:℃ 1:℉
    uint8_t calibration_enable;
    int16_t calibration_value;
    uint8_t auto_report_enable;
    uint8_t auto_report_diff;
    int16_t calibration_value2;
    uint16_t alarm_value;
    uint8_t alarm_enable;
    int8_t reserved[3];
} ts201_sensor_cfg_t;

typedef struct {
    // 传感器配置
    ts201_sensor_cfg_t temp;
    ts201_sensor_cfg_t humi;
} user_config_ts201_t;

typedef struct  ts30x_sensor_cfg_s{
        uint8_t enable;
        uint8_t unit;
        uint8_t calibration_enable;
        int16_t calibration_value;
        uint8_t auto_report_enable;
        uint8_t auto_report_diff;
		int16_t calibration_value2;
		uint16_t alarm_value;
		uint8_t alarm_enable;
        int8_t reserved[3];
} ts30x_sensor_cfg_t;

typedef struct {
    ts30x_sensor_cfg_t sensor_cfg[4];
} user_config_ts30x_t;

typedef struct sleep_config {
    uint8_t sleep_enable;   //休眠使能
    uint16_t sleep_start;   //休眠起始时间
    uint16_t sleep_over;    //休眠结束时间
    uint8_t week_day;        //星期配置 0000 0000 高七位对应星期天到一，最低位为关
} sleep_cfg_s;

typedef struct {
	uint16_t calibration_depth; //标定深度
    sleep_cfg_s sleep_cfg; //休眠配置
	uint8_t calibration_enable;	//校准补偿使能
	int8_t calibration_value;	//校准值
	uint8_t crosstalk_enable;	//串扰补偿使能
	int8_t crosstalk_value;		//串扰补偿值
    uint8_t reserved[4]; //预留
} user_config_ws201_t;

typedef struct {
    uint16_t calibration_depth;   //标定深度 即toolbox配置纸盒深度
    sleep_cfg_s sleep_cfg;        //休眠配置
    uint8_t offset_cali_complete;   //offset校准完成标志
    uint8_t xtalk_cali_complete;    //xtalk校准完成标志
    int8_t vi530x_cali_cg_pos;       // xtalk标定得到的position参数
    uint8_t vi530x_cali_cg_maxratio; // xtalk标定得到的Maxratio参数
    float vi530x_cali_offset;     // offset标定得到的offset参数
} user_config_ws201v2_t;

#pragma pack()

#pragma pack(push, DD, 1)
#pragma pack(1)
typedef struct user_config_n1 {
	io_setting_t gpio[UNXX_MAX_GPIO_NUM];
	ai_setting_t ai;
	modbus_setting_t modbus;
} user_config_t_n1;
typedef struct user_config_n1_new_s {
	io_setting_t gpio[UNXX_MAX_GPIO_NUM];
	ai_setting_t2 ai;
	modbus_setting_t2 modbus;
} user_config_t_n1_new_t;
#pragma pack(pop)

/*-------------------------------------SDI-12 结构体------------------------------------*/
#define CURRENT_NUM         		 2
#define VOLTAGE_NUM         		 2
#define UNP_SDI_NAME_MAX_LEN 		 16
#define UNXX_MAX_SDI_NUM			 16
#define UNXX_COMMAND_SIZE    		 64
/**************************************************
 * @brief SDI-12通道配置
 **************************************************/
typedef struct sdi_channel_set_e {
    uint8_t enable;                     //对应使能口
    uint8_t address;                    //存放获取的地址
    uint8_t custom_command[UNXX_COMMAND_SIZE];	//发送命令集
    uint8_t name[UNP_SDI_NAME_MAX_LEN]; //名称
    uint8_t reserve[6];                 //预留
} sdi_channel_set_t;

/**************************************************
 * @brief SDI-12全局配置
 **************************************************/
typedef struct sdi_global_set_e {
    uint8_t retry_times;               //最大重试次数
    uint16_t poweron_time;             //采集前对设备供电时间
    uint8_t pass_through_enable;       //透传使能
    uint8_t pass_through_port;         //透传端口
    uint8_t reserve2[2];
} sdi_global_set_t;

/**************************************************
 * @brief SDI-12设置 结构体
 **************************************************/
typedef struct sdi_setting_e {
	sdi_global_set_t global;
#if UNXX_MAX_SDI_NUM > 0	
	sdi_channel_set_t chan[UNXX_MAX_SDI_NUM];
#endif	
} sdi_setting_t;

/*-------------------------------------end------------------------------------*/

#pragma pack(1)
typedef struct ai_config_s {
    uint8_t enable;
    uint8_t unit[8];
    float osh;
    float osl;
    uint8_t reserved[4];
} ai_config_t;
#pragma pack()

typedef struct user_config_v3 {
	io_setting_t gpio[UNXX_MAX_GPIO_NUM];
	ai_setting_t2 ai;
    ai_config_t current[CURRENT_NUM];		// 新增AIcurrent Osh 和Osl
    ai_config_t voltage[VOLTAGE_NUM];		// 新增AIvoltage Osh 和Osl
	modbus_setting_t_v3 modbus;       
} user_config_t_v3;

typedef struct user_config_sdi {
    sdi_setting_t sdi; 
} user_config_t_sdi;

typedef struct cut_sdi_config {
    uint8_t enable;
	uint32_t baud;
	uint8_t databits;
	uint8_t stopbits;
	uint8_t parity;
	uint8_t flow;    
    uint8_t power_enable;
	uint16_t sdi_current;
} cut_sdi_config_t;

typedef struct unxxtime_e {
	uint8_t sec;
	uint8_t min;
	uint8_t hour;
	uint8_t date;
	uint8_t month;
	uint16_t year;
	uint8_t weekday;
} unxxtime_t;

struct clock {
	uint8_t enable;
	unxxtime_t alarm;
};

typedef struct uc11t1_status_e {
	uint8_t battery;
	uint8_t joinstate;
	uint8_t power_state;
	int8_t snr;
	int16_t rssi;
	uint32_t uplink_counter;
	uint32_t downlink_counter;
	uint16_t  mask[7];
} uc11t1_status_t;

typedef struct uc11t1_status_extend_e {
    uint32_t d2d_freq;
    uint8_t d2d_dr;
    uint8_t reserved1[27];
} uc11t1_status_ex_t;

typedef struct uc11t1_temphumi_e {
	float humi;
	float temp;
} uc11t1_temphumi_t;

#pragma pack(1)

enum em400_nb_app_mode_e {
    EM400_NB_APP_NONE = 0,
    EM400_NB_APP_UDP,
    EM400_NB_APP_TCP,
    EM400_NB_APP_AWS,
    EM400_NB_APP_MQTT,
    EM400_NB_APP_MILESIGHT_CLOUD,
};
typedef struct {
    uint8_t enable;
    uint8_t unit;
    uint8_t calibration_enable;
    int16_t calibration_value;
    uint8_t auto_report_enable;
    uint8_t auto_report_diff;
    int16_t calibration_value2;
    uint16_t alarm_value;
    uint8_t alarm_enable;
    int8_t reserved[3];
} em400_nb_sensor_cfg_t;

typedef struct {
    em400_nb_sensor_cfg_t distance;
    //em400_sensor_cfg_t temp;
} user_config_em400_nb_t;

typedef struct em400_nb_udl_config_s {
    uint32_t collect_cycle;
    uint32_t report_cycle;
    abnormal_check_set1_t abnormal_check_set;
    abnormal_check_patch_set1_t abnormal_check_patch_set;
    uint16_t delta;
    uint16_t height;
} em400_nb_udl_config_t;

typedef struct em400_nb_tof_config_s {
    uint32_t collect_cycle;
    uint32_t report_cycle;
    uint16_t delta;
    uint16_t height;
} em400_nb_tof_config_t;

typedef struct em400_nb_tof_application_s {
    uint8_t mode;
    uint8_t enable;
    em400_nb_tof_config_t config[3];
} em400_nb_tof_application_t;

typedef struct em400_nb_udl_application_s {
    uint8_t mode;
    uint8_t enable;
    em400_nb_udl_config_t config[3];
} em400_nb_udl_application_t;

typedef struct em400_nb_application {
    uint8_t linkage_enable;           //倾斜和联动测距开关
    uint8_t cumulative_enable;        //累计次数开关
    uint8_t cumulative_count;         //累计次数
    uint8_t gps_enable;               //定位设置开关
    uint8_t move_duration;            //持续运动时间
    uint32_t static_duration;         //持续静止时间
    uint8_t report_move_enable;       //运动上报开关
    uint32_t report_move_interval;    //运动上报间隔
	uint8_t resp_enable;              //回复包开关
    em400_nb_tof_application_t tof;
    em400_nb_udl_application_t udl;
} em400_nb_application_t;

typedef struct cellular_info_s {
    uint8_t imei[16];
    uint8_t imsi[16];
    uint8_t iccid[24];
    uint8_t network_status;     //网络状态 注网：1 非注网：0
    uint8_t signal_strength;    //信号强度
    uint8_t longitude[16];      //经度
    uint8_t latitude[16];       //纬度
    uint8_t altitude[8];        //海拔
    uint8_t is_insert;          //是否插卡
    int32_t rssi;
    uint8_t upgrade_result;     //升级结果
    uint8_t pin[10];
    uint8_t apn[32];           //apn
    uint8_t apn_user[48];      //apn用户名
    uint8_t apn_password[48];  //apn密码
    uint8_t apn_auth;          //apn鉴权方式 0：auto 1：chap 2：pap
    uint8_t rat_pref;          //网络类型 0 仅cat m 1：仅catNB 2 自动
    uint8_t cnf_version;       //配置版本
} cellular_info_t;

typedef struct mqtt_config_s {
    uint16_t server_port;       //服务器端口
    uint8_t server_ip[64];      //服务器地址
    uint8_t receipt_enable;     //用户凭证开关 关闭：0 开启：1
    uint8_t name[32];           //用户名
    uint8_t password[32];       //密码
    uint8_t client_id[64];      //mqtt client id
    uint8_t tls_enable;         //tls协议开关 关闭：0 开启：1
    uint8_t tls_protocol[8];    //tls协议版本号默认v1.2
    uint8_t root_cert;          //根文件     不存在：0 存在：1
    uint8_t client_cert;        //客户端证书 不存在：0 存在：1
    uint8_t client_key;         //客户端密钥 不存在：0 存在：1
} mqtt_config_t;

typedef struct tcp_udp_config_s {
    uint16_t server_port;
    uint8_t server_ip[64];
} tcp_udp_config_t;


typedef struct aws_config_s {
    uint8_t server_ip[64];      //服务器端口
    uint8_t root_cert;          //服务器地址
    uint8_t client_cert;
    uint8_t client_key;
} aws_config_t;

typedef struct transmit_config_s {
    uint8_t mode;             //模式 Milesight IoT cloud: 1 MQTT: 2 AWS:3 TCP: 4 UDP: 5
    union
    {
        aws_config_t aws;
        mqtt_config_t mqtt;
        tcp_udp_config_t tcp;
        tcp_udp_config_t udp;
    } protocol;

} transmit_config_t;

typedef struct vs350_sensor_config{
	uint8_t  enable;
	uint8_t  unit;
	uint8_t  enable_temp_calibration;
    int16_t temp_calibration_value;
	int16_t temp_calibration_value2;
} vs350_sensor_config_t;

typedef struct {
	vs350_sensor_config_t temp;
} user_config_vs350_t;

typedef struct vs351_sensor_config{
    uint8_t enable;
    uint8_t unit;
    uint8_t calibration_enable;
    uint8_t auto_report_diff;
    int16_t calibration_value;
    int16_t calibration_value2;
    uint16_t alarm_value;
    uint8_t alarm_enable;
    int8_t reserved[5];
} vs351_sensor_config_t;

typedef struct {
	vs351_sensor_config_t temp;
} user_config_vs351_t;

typedef struct vs321_sensor_config {
    uint8_t activate;
    uint8_t nameChoosen;
    uint8_t customName[32];
    uint8_t customPassword[16];
} vs321_sensor_config_t;

enum uc50x_nb_app_mode_e {
    UC50X_NB_APP_NONE = 0,
    UC50X_NB_APP_UDP  = 1,
    UC50X_NB_APP_TCP  = 2,
    UC50X_NB_APP_AWS  = 3,
    UC50X_NB_APP_MQTT = 4,
    UC50X_NB_APP_IOT_CLOUD = 5,
};

#pragma pack()

/*extern*/
extern unp_state_t deal_with_unp(uint8_t *data, uint32_t len, unp_comnct_t type);
extern unp_state_t unp_send_passwd(uint8_t *passwd, uint16_t len);
extern unp_state_t unp_reset_device(void);
extern unp_state_t unp_send_reboot_request(void);
extern unp_state_t unp_send_upgrade_request(void);
extern unp_state_t unp_upgrade_check(uint32_t crc32, uint8_t *productid, uint8_t *hwver, uint8_t *swver);
extern unp_state_t unp_send_upgrade_image(uint8_t *data, uint32_t datasize);
extern unp_state_t unp_upgrade_complete(void);
extern unp_state_t unp_connect_device(void);
extern unp_state_t unp_set_msg_condition(uint8_t num, uint8_t *context);
extern unp_state_t unp_get_msg_condition(uint8_t num, uint8_t *out);
extern unp_state_t unp_set_msg_action(uint8_t num, uint8_t *context);
extern unp_state_t unp_get_msg_action(uint8_t num, uint8_t *out);
extern unp_state_t unp_set_alarm_clock(uint8_t num, struct clock *alarmclock);
extern unp_state_t unp_get_alarm_clock(uint8_t num, struct clock *alarmclock);
extern unp_state_t unp_set_current_time(unxxtime_t *cur);
extern unp_state_t unp_get_current_time(unxxtime_t *cur);
extern unp_state_t unp_get_product_name(uint8_t *name);
extern unp_state_t unp_get_product_pn(uint8_t *pn);
extern unp_state_t unp_get_product_real_pn(uint8_t *real_pn);
extern unp_state_t unp_get_product_oem(uint8_t *oem);
extern unp_state_t unp_get_product_sn(uint8_t *sn);
extern unp_state_t unp_get_product_hwver(uint8_t *hwver);
extern unp_state_t unp_get_product_swver(uint8_t *swver);
extern unp_state_t unp_get_product_subswver(uint8_t *subswver);
extern unp_state_t unp_get_mobile_state(unp_mobile_state_t *state);
extern unp_state_t unp_get_mobile_signal(uint8_t *signal);
extern unp_state_t unp_get_inputio_status(uint8_t gpionum, uint8_t *value);
extern unp_state_t unp_get_outputio_status(uint8_t gpionum, uint8_t *value);
extern unp_state_t unp_set_uartcfg(struct console_param *uartcfg, uint8_t id);
extern unp_state_t unp_get_uartcfg(struct console_param *uartcfg, uint8_t id);
extern unp_state_t unp_set_passwd(uint8_t *old_passwd, uint8_t *new_passwd);
extern unp_state_t unp_set_report_number(uint8_t num, uint8_t *value);
extern unp_state_t unp_get_report_number(uint8_t num, uint8_t *value);
extern unp_state_t unp_set_ctrl_number(uint8_t num, uint8_t *value);
extern unp_state_t unp_get_ctrl_number(uint8_t num, uint8_t *value);
extern unp_state_t unp_get_report_by_sms(uint8_t *value);
extern unp_state_t unp_set_report_by_sms(uint8_t value);
extern unp_state_t unp_get_ctrl_by_sms(uint8_t *value);
extern unp_state_t unp_set_ctrl_by_sms(uint8_t value);
extern unp_state_t unp_get_context_type(context_type_t *type);
extern unp_state_t unp_set_context_type(context_type_t type);
extern unp_state_t unp_get_sms_dcs(sms_dcs_t *code);
extern unp_state_t unp_set_sms_dcs(sms_dcs_t code);
extern unp_state_t unp_get_change_report(uint8_t *value);
extern unp_state_t unp_set_change_report(uint8_t value);
extern unp_state_t unp_get_fail_report(uint8_t *value);
extern unp_state_t unp_set_fail_report(uint8_t value);
extern unp_state_t unp_get_succ_report(uint8_t *value);
extern unp_state_t unp_set_succ_report(uint8_t value);
extern unp_state_t unp_get_report_interval(uint32_t *value);
extern unp_state_t unp_set_report_interval(uint32_t value);
extern unp_state_t unp_get_ussd_prefix(uint8_t *ussd_prefix);
extern unp_state_t unp_set_ussd_prefix(uint8_t *ussd_prefix);
extern unp_state_t unp_get_app_mode(app_mode_t *mode);
extern unp_state_t unp_set_app_mode(app_mode_t mode);
extern unp_state_t unp_get_cellular_pin(uint8_t *pin);
extern unp_state_t unp_set_cellular_pin(uint8_t *pin);
extern unp_state_t unp_get_cellular_sca(uint8_t *sca);
extern unp_state_t unp_set_cellular_sca(uint8_t *sca);
extern unp_state_t unp_get_cellular_net_type(cellular_network_t *value);
extern unp_state_t unp_set_cellular_net_type(cellular_network_t value);
extern unp_state_t unp_set_devname(uint8_t *devname);
extern unp_state_t unp_get_devname(uint8_t *devname);
extern unp_state_t unp_set_passwd(uint8_t *old_passwd, uint8_t *new_passwd);
extern unp_state_t unp_set_output_gpio(uint8_t gpionum, uint8_t state, uint32_t continue_time);
extern unp_state_t unp_get_device_status(uint8_t *status, uint8_t *size);
extern unp_state_t unp_get_prikey(uint8_t *data, uint16_t datasize);
extern unp_state_t unp_set_update_prikey(uint8_t *data, uint16_t datasize);
extern unp_state_t unp_get_devcrt(uint8_t *data, uint16_t datasize);
extern unp_state_t unp_set_update_devcrt(uint8_t *data, uint16_t datasize);
extern unp_state_t unp_get_rootcrt(uint8_t *data, uint16_t datasize);
extern unp_state_t unp_set_update_rootcrt(uint8_t *data, uint16_t datasize);
extern unp_state_t unp_get_endpoint_addr(uint8_t *addr);
extern unp_state_t unp_set_endpoint_addr(uint8_t *addr);
extern unp_state_t unp_get_endpoint_name(uint8_t *name);
extern unp_state_t unp_set_endpoint_name(uint8_t *name);
extern unp_state_t unp_get_collect_cycle(uint32_t *cycle);
extern unp_state_t unp_set_collect_cycle(uint32_t cycle);
extern unp_state_t unp_get_cloud_cycle(uint32_t *cycle);
extern unp_state_t unp_set_cloud_cycle(uint32_t cycle);
extern unp_state_t unp_get_ai_value(uint8_t num, float *value);
extern unp_state_t unp_set_modbus_chan_cfg(modbus_channel_set_t *chan_cfg, uint8_t num);
extern unp_state_t unp_get_modbus_chan_cfg(modbus_channel_set_t *chan_cfg, uint8_t num);
extern unp_state_t unp_set_modbus_global_cfg(modbus_global_set_t *global_cfg);
extern unp_state_t unp_get_modbus_global_cfg(modbus_global_set_t *global_cfg);
extern unp_state_t unp_set_modbus_global_cfg_new(modbus_global_set_t2 *global_cfg);
extern unp_state_t unp_get_modbus_global_cfg_new(modbus_global_set_t2 *global_cfg);
extern unp_state_t unp_set_modbus_global_cfg_v3(modbus_global_set_v3 *global_cfg);
extern unp_state_t unp_get_modbus_global_cfg_v3(modbus_global_set_v3 *global_cfg);
extern unp_state_t unp_set_mqtt_keepalive(uint32_t keepalive);
extern unp_state_t unp_get_mqtt_keepalive(uint32_t *keepalive);
extern unp_state_t unp_get_mobile_apn(uint8_t *apn);
extern unp_state_t unp_set_mobile_apn(uint8_t *apn);
extern unp_state_t unp_get_ai_chan_cfg(uint8_t chan, ai_channel_set_t *cfg);
extern unp_state_t unp_set_ai_chan_cfg(uint8_t chan, ai_channel_set_t *cfg);
extern unp_state_t unp_set_ai_global_cfg(ai_global_set_t *cfg);
extern unp_state_t unp_get_ai_global_cfg(ai_global_set_t *cfg);
extern unp_state_t unp_set_ai_global_cfg_new(ai_global_set_t2 *cfg);
extern unp_state_t unp_get_ai_global_cfg_new(ai_global_set_t2 *cfg);
extern unp_state_t unp_set_3v3_state(uint8_t enable_3v3_out1, uint8_t enable_3v3_out2);
extern unp_state_t unp_get_3v3_state(uint8_t *enable_3v3_out1, uint8_t *enable_3v3_out2);
extern unp_state_t unp_get_gpio_config(uint8_t num, io_setting_t *cfg);
extern unp_state_t unp_set_gpio_config(uint8_t num, io_setting_t *cfg);

#ifdef SUPPORT_UPGRADE_UBOOT
extern unp_state_t unp_uboot_upgrade_request(void);
extern void unp_send_uboot_image(uint8_t *data, uint16_t datasize);
extern unp_state_t unp_uboot_complete(void);
#endif

//uc11t1 new
extern unp_state_t unp_get_uc11t1_status(uc11t1_status_t *status);
extern unp_state_t unp_get_uc11t1_data(uc11t1_temphumi_t *temphumi);
extern unp_state_t unp_get_uc11t1_alarm(uint8_t num, alarm_rules_t *alarmconfig);
extern unp_state_t unp_set_uc11t1_alarm(uint8_t num, alarm_rules_t *alarmconfig);
extern unp_state_t unp_get_abnormal_check(abnormal_check_set_t * abnormal, abnormal_check_patch_set_t *abnormal_patch);
extern unp_state_t unp_set_abnormal_check(abnormal_check_set_t * abnormal, abnormal_check_patch_set_t *abnormal_patch);
extern unp_state_t unp_get_uc11t1_loraparams(uint8_t *data, uint8_t start, uint8_t size);
extern unp_state_t unp_set_uc11t1_loraparams(uint8_t *data, uint8_t start, uint8_t size);

/*local*/
extern unp_state_t atoh(uint8_t *in, uint8_t insize, uint8_t *out);
extern unp_state_t htoa(uint8_t *in, uint8_t insize, uint8_t *out);
extern void get_device_appkey(uint8_t *data);
extern void get_device_passwd(uint8_t *data);
extern void get_productid(uint8_t *data);
extern void get_device_hwver(uint8_t *data);
extern void set_device_swver(uint8_t *data);
extern void get_device_name(uint8_t *data);
extern void get_device_pn(uint8_t *data);
extern void get_device_real_pn(uint8_t *data);
extern void get_device_custom(uint16_t *value);
extern void get_device_sn(uint8_t *data);
 #ifdef USE_UNXX_SPIFLASH
extern void get_upgrade_info(uint8_t *flag, uint32_t *crc32, uint32_t *size);
extern void set_upgrade_info(uint8_t flag, uint32_t crc32, uint32_t size);
#else
extern void set_upgrade_enable_flag(uint8_t upgrade_enable);
extern void set_upgrade_flag(uint8_t *buf);
extern void get_upgrade_flag(uint8_t *buf);
#endif
extern void write_data_to_flash(uint32_t *data, uint16_t len_bytes, uint32_t * addr);
void write_data_to_flash1(uint32_t *data, uint16_t len_bytes, uint32_t addr);
extern void read_data_from_flash(uint32_t *data, uint16_t len_bytes, uint32_t* addr, uint8_t fromisr);
extern unp_state_t write_device_params(uint8_t *data, uint16_t datasize);
extern uint16_t read_device_params(uint8_t *params, uint8_t *data);
extern void unxx_reset_device(void);
extern void unxx_restart_device(void);
extern uint16_t generate_pkt(uint8_t *data, uint16_t datasize, uint8_t *pkt, unp_pack_t type);
extern uint8_t unp_frame_split(uint8_t *data, uint16_t datasize, uint16_t *pos, uint16_t *len);
extern void unp_set_ussd_ack(uint8_t *data, uint16_t datasize);
extern void unp_send_pkt(uint8_t *data, uint16_t pktsize);
//USB���ػ� T1 N1
extern unp_state_t  unp_get_device_state(uint8_t *state);
extern unp_state_t unp_set_power_on(void);
extern unp_state_t unp_set_power_off(void);
#if defined(LORAWAN_DEVICE)
extern void unp_set_lorawan_ack(uint8_t *data, uint16_t datasize);
extern void unxx_lorawan_reload(void);
//set ����ģʽ
extern void set_comnct_type(unp_comnct_t g_comnct_type_tmp);
#endif
#endif
