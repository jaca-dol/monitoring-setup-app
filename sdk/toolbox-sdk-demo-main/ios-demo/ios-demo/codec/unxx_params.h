#ifndef __UNXX_PARAMS_H__
#define __UNXX_PARAMS_H__
#include <stdio.h>
#include <stdbool.h>
#include "unp.h"

#define UNXX_MAGIC              "UC11N1"
#define UNXX_LORA_APP_PORT      0x55
#define UNXX_LORA_DTU_PORT      0x56

// UC50X版本号判断
typedef enum
{
	S_VERSION_0 = 0,
	S_VERSION_1,
	S_VERSION_2,
} uc50x_version_t;

typedef enum params_lock{
	PARAMS_LOCK   = 0x55,
	PARAMS_UNLOCK = 0,
}params_lock_t;

typedef enum ack_mask_e {
	ALARM_PKT_ACK_MASK   = 0x01,
	REGULAR_PKT_ACK_MASK = 0x02,

	FORCE_PKT_ACK_MASK   = 0x80,
}ack_mask_t;

typedef struct unxx_magic {
	uint8_t magic[10];
	uint8_t reset_report;
} unxx_magic_t;//11

#pragma pack(1)
typedef struct d2d_master_s {
	uint8_t enable;	//0为lora 1为D2D  3为D2D＋LoRa
	uint16_t cmd; //两个字节，取值范围0x0000~0xffff
} d2d_master_t;
typedef struct sleep_config_s {
    uint8_t sleep_enable;   //休眠使能
    uint8_t uplink_enable;  //上行使能
    uint16_t sleep_start;   //休眠起始时间
    uint16_t sleep_over;    //休眠结束时间
    uint8_t week_day;       //星期配置 0000 0000 高七位对应星期天到一，最低位为关
} sleep_cfg_t;
typedef struct new_alarm_rules_s {
    uint8_t mode;
    int16_t max_value;
    int16_t min_value;
    uint16_t continue_time;
    uint16_t lock_time;
    uint8_t enable;
    int16_t max_value2;
    int16_t min_value2;
} new_alarm_rules_t;
typedef struct new_sensor_cfg_s {
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
} new_sensor_cfg_t;
typedef struct motion_check_s {
    uint8_t limits;
    uint16_t time;
} motion_check_t;
#pragma pack()

typedef struct product_info_e {
	uint8_t productid[UNP_PRODUCT_ID_LEN + 1];
	uint8_t series[UNP_SERIES_LEN + 1];
	uint8_t productsn[UNP_PRODUCT_SN_LEN2 + 1];
	uint8_t hwver[UNP_HWVER_LEN + 1];
	uint8_t swver[UNP_SWVER_LEN + 1];
	uint8_t nonce[UNP_NONCE_LEN + 1];
    uint8_t support_random_key;                         // 烧录时置位 0x55
    uint8_t head_version;                           	// ws50x在使用
	uint8_t ucp_version;
	uint8_t productid_em[UNP_PRODUCT_ID_LEN_EM+1];
	uint8_t pn_version;
	uint8_t rx_swver[UNP_SWVER_LEN + 1];
	uint8_t ax_swver[UNP_SWVER_LEN + 1];
} product_info_t;//42

typedef struct pn_info_e {
	uint8_t custom[UNP_CUSTOM_LEN + 1];
	uint8_t region[UNP_REGION_LEN + 1];
	uint8_t pn[UNP_PN_NUM][UNP_PN_LEN + 1];
	uint8_t pn_em[UNP_PN_NUM][UNP_PN_LEN_EM + 1];
} pn_info_t;//28

typedef struct {
	uint8_t custom[UNP_CUSTOM_LEN + 1];
	uint8_t region[UNP_REGION_LEN + 1];
    uint8_t oem[UNP_OEM_V1_LEN + 1];
    uint8_t subModel[UNP_SUBMODEL_NUM][UNP_SUBMODEL_LEN+1];
    uint8_t pn[UNP_PN_V1_NUM][UNP_PN_V1_LEN+1];
} pn_info_v1_t;

typedef struct alias_patch_s {
    uint8_t name_ext[32+1];
    uint8_t pn_ext[32+1];
} alias_patch_t;

typedef union device_patch_u {
	alias_patch_t alias;
	struct console_param con_param[UART_MAX_ID];
} device_patch_t;

typedef struct device_param_e {
	uint8_t name[UNP_PRODUCT_SN_LEN + 1];
	uint8_t password[UNP_PASSWD_LEN + 1];
	uint8_t debug;
	uint8_t change_battery;
	uint8_t abort_reboot;
	uint8_t device_state;
	uint32_t timestamp;
	int16_t timezone;
	//struct console_param con_param[UART_MAX_ID];
    device_patch_t patch;
} device_param_t;//228

typedef struct application_set_e {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t sleepmode;
	abnormal_check_set_t abnormal_check_set;
	uint8_t display_mode;
	abnormal_check_patch_set_t abnormal_check_patch_set;
} application_set_t;//6

typedef struct block_s {
    uint8_t enable;
    uint8_t begin;
    uint8_t end;
    uint16_t value;
    uint8_t co2_collect_period;
    uint8_t others_collect_period;
} block_t;

typedef struct s11_abc_parmas_s {
    uint8_t enable;
    uint16_t period;
    uint16_t target;
} s11_abc_parmas_t;

typedef struct co2_params_s {
	bool use_average;
	s11_abc_parmas_t abc;
} co2_params_t;

typedef struct application_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t intelligent_display;
	abnormal_check_set_t abnormal_check_set;
	uint8_t led_enable;
    uint8_t epaper_bg;     //0:白底 1:黑底
    uint8_t epaper_disable;
    block_t block[3];
    uint16_t display_period;
    co2_params_t co2_params;
    uint8_t time_display;
    uint16_t least_display_period;
    sleep_cfg_t sleep_cfg;
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
} application_set_t_am103;

typedef enum d2d_id_e {
    EM500_D2D_ID_ALARM_OCCUR,
    EM500_D2D_ID_ALARM_RECOVER,
    EM500_D2D_ID_ALARM_SALTATION,
    EM500_D2D_ID_SMTC_OCCUR,    //电导率阈值触发
    EM500_D2D_ID_SMTC_RECOVER,  //电导率阈值解除
    EM500_D2D_ID_APPCFG_MAX,
    EM500_D2D_ID_HUMIDITY_OCCUR = EM500_D2D_ID_APPCFG_MAX,  //SMTC 湿度阈值触发
    EM500_D2D_ID_HUMIDITY_RECOVER,//SMTC 湿度阈值解除
    EM500_D2D_ID_MAX
} em500_d2d_id_t;
typedef struct em500_d2d_master_s {
    uint8_t enable;
    uint8_t uplink_lora;
    uint16_t cmd;
} em500_d2d_master_t;

typedef struct application_em500 {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t intelligent_display;
	abnormal_check_set_t abnormal_check_set;
	uint8_t soil_type; //0:矿物土；1:沙土；2：粘土；3：有机土
	abnormal_check_patch_set_t abnormal_check_patch_set;
	co2_params_t co2_params;
	struct co2_compensate_s {
		uint8_t enable;
		uint16_t range;
		uint8_t reserved;
	} co2_compensate;
	uint8_t is_data_storage_enable;
	uint8_t restransmit_enable;
	uint16_t restransmit_period;
	uint16_t storage_query_period;
	em500_d2d_master_t d2d_set[EM500_D2D_ID_APPCFG_MAX];
} application_set_t_em500;

typedef struct sensor_config_em500 {
	sensor_cfg_t sensor_cfg[7];
    em500_d2d_master_t d2d_set[EM500_D2D_ID_MAX - EM500_D2D_ID_APPCFG_MAX];
} user_config_t_em500;

typedef struct application_ws302 {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t led_enable;
    uint8_t time_weight;
	uint8_t freq_weight;
} application_set_t_ws302;

typedef struct application_fp001 {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t led_mode;
    uint8_t buzz_mode;
} application_set_t_fp001;

typedef struct application_set_e_n1 {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t enable_3v3_out1;
	uint8_t enable_3v3_out2;
	uint8_t keep_pwr_state;
	uint8_t pwr_state;
    uint8_t connect_pwr;            // 线开关机参数
    uint32_t classa_response_time;  // 响应时间参数
    uint8_t report_enable_type;     // 上报数据类型	UC50X_V3历史记录存储使能
    uint8_t retransmit_enable;		// 配置重传功能是否使能
    uint16_t restransmit_period;	// 配置重传的周期，单位秒
    uint16_t storage_query_period;  // 查询数据的上传周期，单位秒
    uint16_t current_3v3_out1;
    uint16_t current_12v_out1;
    uint16_t current_3v3_out2;
    uint16_t current_12v_out2;
    uint8_t update_config;          // 更新标志
    uint8_t battery_protect;        // 电池低温充电保护
	uint16_t current_sdi_out;       //sdi供电电流
} application_set_t_n1;//6

#pragma pack(1)

typedef struct radar_cfg_s {
    uint16_t range;          //量程，结束位置
    uint16_t start;          //起始位置
    uint16_t step;           // 步进长度，默认2
    int16_t signal;          // 信号质量-10-35
    int16_t sensitivity;     // 灵敏度0.1-1.0
    uint8_t peek_sort;       // 0:最近,1:最强
    uint8_t max_profile;     // 最大轮廓长度(最大脉冲长度), 1-5
    uint8_t shape;           // 0：通用 1：平面
    uint8_t algorithm;       // 0:AMPLITUDE, 1:STRENGTH, 2:RECORDED, 3:CFAR
    uint8_t reserved[4];
} radar_cfg_t;

typedef struct abnormal_check_new_s {
    uint8_t enable;
    uint16_t range;
    uint16_t percentage;
    uint8_t retry_count;
    uint8_t retry_interval;
    uint8_t reserved[8];
} abnormal_check_new_t;

typedef struct application_em410_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t collect_cycle_unit; // 0:秒 1:分钟
    uint8_t report_cycle_unit;  // 0:秒 1:分钟
    uint8_t mode;               // 0:通用模式 1:雨水井模式 2：污水井模式
    radar_cfg_t radar_cfg[3];   // 三种模式的雷达配置
    uint8_t blind_dect;         // 盲区检测
    uint8_t motion_blind_cal;    // 移动触发盲区校准
    uint8_t tilt_distance_off;   // 倾斜关闭采集
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    motion_check_t move;
    motion_check_t rest;
    // 异常检查设置参数
    abnormal_check_new_t abnormal_check_set;
    uint8_t ble_enable;
    uint8_t report_tilt;
    uint8_t move_cal_enable;
    radar_cfg_t radar_cfg_ex[2];   // 储罐模式的雷达配置
} application_em410_t;

typedef struct alarm_params_em410_s {
    new_alarm_rules_t rules[2];
    new_alarm_rules_t rules_ex[2];
} alarm_params_em410_t;

typedef struct user_config_em410_s {
    new_sensor_cfg_t sensor_cfg[1];
} user_config_em410_t;

typedef struct application_uc51x_e {
    uint16_t collect_cycle;         // 采集周期参数 s
    uint16_t report_cycle;          // 上报周期参数 s
    uint16_t storage_query_period;  // 存储查询周期参数 s
    uint8_t keep_pwr_state;         // 保持电源状态参数
    uint8_t is_data_storage_enable;
    uint8_t connect_pwr;            // 线开关机参数，使能
    uint8_t restransmit_enable;
    uint16_t restransmit_period;    // 重传周期参数 s
    uint32_t classa_response_time;  // 响应时间参数 s
    uint8_t report_enable_type;     // 上报数据类型
    uint8_t crtl_count;             // 电磁阀控制参数，连续控制次数
    uint16_t ctrl_time;             // 电磁阀控制参数，单次控制脉冲时间 ms
    uint16_t power_time;            // 电磁阀控制参数，单次控制前给电容充电时间 ms
    uint8_t gpi_mode[2];            // 输入引脚功能
    uint16_t jitter_time;           // 反馈状态消抖时间 s
    uint8_t update_config;          // 更新标志
    uint8_t battery_protect;        // 电池低温充电保护
    uint8_t auto_confirm;           // IPSO自动应答
    uint8_t filter_mode;            // 滤波模式
    uint16_t filter_time;           // 滤波时间 硬件us 软件ms
    uint16_t v12_power_time;        // 12V电源供电时间 ms
    struct ai_cfg_s {
        uint8_t enable;             // AI使能
        uint8_t unit;               // AI单位 ai_unit_e
        uint8_t calibration_enable; // 校准使能
        int16_t calibration_value;  // 校准值 kpa
        uint8_t type;               // AI类型 ai_type_e
        uint8_t mode;               // AI模式 ai_mode_e
        uint16_t range_min;         // AI量程最小值 mv/ua
        uint16_t range_max;         // AI量程最大值 mv/ua
        uint16_t pressure_min;      // 压力量程最小值 kpa
        uint16_t pressure_max;      // 压力量程最大值 kpa
    } ai_cfg;
    uint16_t irrigation_collect_cycle; // 灌溉期间,采集周期参数 s
    uint8_t open_delay_collect_time;   // 开阀延时采集时间, 单位min [0~60]
} application_uc51x_t;

typedef struct application_ux52x {
    uint16_t collect_cycle;         // 采集周期参数 s
    uint16_t report_cycle;          // 上报周期参数 s
    bool     report_valve_change;   // 上报阀门状态变化
    // uint16_t storage_query_period;  // 存储查询周期参数 s
    uint8_t keep_pwr_state;         // 保持电源状态参数
    // uint8_t is_data_storage_enable;
    uint8_t connect_pwr;            // 线开关机参数，使能
    // uint8_t restransmit_enable;
    // uint16_t restransmit_period;    // 重传周期参数 s
    // uint32_t classa_response_time;  // 响应时间参数 s
    uint8_t report_enable_type;     // 上报数据类型
    uint8_t gpi_mode[2]; // 输入引脚功能
    uint16_t jitter_time;           // 反馈状态消抖时间 s
    uint8_t update_config;          // 更新标志
    uint8_t battery_protect;        // 电池低温充电保护
    uint8_t auto_confirm;           // IPSO自动应答
    uint8_t filter_mode;            // 滤波模式
    uint16_t filter_time;           // 滤波时间 硬件us 软件ms
    uint16_t v12_power_time;        // 12V电源供电时间 ms
    struct {
        uint8_t enable;             // AI使能
        uint8_t unit;               // AI单位 ai_unit_e
        uint8_t calibration_enable; // 校准使能
        int16_t calibration_value;  // 校准值 kpa
        uint8_t type;               // AI类型 ai_type_e
        uint8_t mode;               // AI模式 ai_mode_e
        uint16_t range_min;         // AI量程最小值 mv/ua
        uint16_t range_max;         // AI量程最大值 mv/ua
        uint16_t pressure_min;      // 压力量程最小值 kpa
        uint16_t pressure_max;      // 压力量程最大值 kpa
    } ai_cfg;
    struct {
        uint8_t  type;               // 阀门类型 0-两通阀 1-三通阀
        uint16_t open_time;          // 阀门开启时间 s
        uint16_t open_time_right;    // 右侧开启时间 s
        bool     auto_calibration;   // 是否自动校正
        bool     report_calibration; // 校正后是否上报消息
        uint16_t block_current;      // 堵转电流
        uint16_t block_time;         // 堵转多长时间认定为堵转
        uint8_t  block_handle;       // 发生堵转时，阀门的处理方式：0-关闭阀门  1-保持堵转放水
        uint8_t  protect_time;       // 保护时间，单位：s
        uint8_t  delay_close_time;   // 延时关闭时间，单位：s
    } valve_cfg[2];
} application_uc52x_t;

typedef struct application_uc52x_lora {
    uint16_t collect_cycle;          // 第一路AI采集周期参数 s
    uint16_t report_cycle;          // 上报周期参数 min
    bool     report_valve_change;   // 上报阀门状态变化
    uint8_t keep_pwr_state;         // 保持电源状态参数
    uint8_t connect_pwr;            // 线开关机参数，使能
    uint32_t classa_response_time;  // 响应时间参数 s
    uint8_t report_enable_type;     // 上报数据类型
    uint8_t gpi_mode[2];            // 输入引脚功能
    uint16_t jitter_time;           // 反馈状态消抖时间 s
    uint8_t update_config;          // 更新标志
    uint8_t battery_protect;        // 电池低温充电保护
    uint8_t auto_confirm;           // IPSO自动应答
    uint8_t filter_mode;            // 滤波模式
    uint16_t filter_time;           // 滤波时间 硬件us 软件ms
    uint16_t v12_power_time;        // 第一路AI12V电源供电时间 ms
    uint16_t v12_power_time_2;      // 第二路AI12V电源供电时间 ms
    uint16_t collect_cycle_2;        // 第二路AI采集周期参数 s
    struct ai_cfg_lora_s {
        uint8_t enable;             // AI使能
        uint8_t unit;               // AI单位 ai_unit_e
        uint8_t calibration_enable; // 校准使能
        int16_t calibration_value;  // 校准值 kpa
        uint8_t type;               // AI类型 ai_type_e
        uint8_t mode;               // AI模式 ai_mode_e
        uint16_t range_min;         // AI量程最小值 mv/ua
        uint16_t range_max;         // AI量程最大值 mv/ua
        uint16_t pressure_min;      // 压力量程最小值 kpa
        uint16_t pressure_max;      // 压力量程最大值 kpa
    } ai_cfg[2];
    struct valve_cfg_s {
        uint8_t  type;               // 阀门类型 0-两通阀 1-三通阀
        uint16_t open_time;          // 阀门开启时间 s
        uint16_t open_time_right;    // 右侧开启时间 s
        bool     auto_calibration;   // 是否自动校正
        bool     report_calibration; // 校正后是否上报消息
        uint16_t block_current;      // 堵转电流
        uint16_t block_time;         // 堵转多长时间认定为堵转
        uint8_t  block_handle;       // 发生堵转时，阀门的处理方式：0-关闭阀门  1-保持堵转放水
        uint8_t  protect_time;       // 保护时间，单位：s
        uint8_t  delay_close_time;   // 延时关闭时间，单位：s
        uint8_t  delay_open_time;    // 延时启动时间，单位：s
    } valve_cfg[2];

    //迭代新增
    uint16_t irrigation_collect_cycle;          // 灌溉第一路采集周期参数 s
    uint16_t irrigation_collect_cycle_2;        // 灌溉第二路采集周期参数 s
    uint8_t open_delay_collect_time[2];         // 开阀延时采集时间, 单位min [0~60]

    uint8_t delay_all_open_time[2];             // 左全开延时时间，单位：s 仅三通阀支持
    uint8_t delay_all_open_time_right[2];       // 右全开延时时间，单位：s 仅三通阀支持

    uint8_t valve_ai_map[2];        // 阀门对应的AI通道 bit0-AI1 bit1-AI2
    
} application_uc52x_lora_t;

typedef struct d2d_parameter {
    uint8_t enable;
    uint16_t cmd;
    uint8_t switch_mode;
} d2d_parameter_t;

typedef struct sensor_cfg_ws51x_s {
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
} sensor_cfg_ws51x_t;

typedef struct user_config_ws51x {
    sensor_cfg_ws51x_t sensor_cfg[1];
} user_config_ws51x_t;

typedef struct application_ws51x_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t led_mode;
	uint8_t power_switch_mode;
	uint8_t socket_lock;
	uint8_t power_meter_enable;
	uint8_t over_current_protect_enable;
	uint8_t over_current_protect_threshold;
	uint8_t over_current_alarm_enable;
	uint8_t over_current_alarm_threshold;
    d2d_parameter_t d2d[16];
    user_config_ws51x_t temperature;
    uint8_t high_current_protect_enable;
} application_ws51x_t;
#pragma pack()

typedef struct application_wts_set_e {
	uint16_t collect_cycle;
	uint16_t report_cycle;	
	uint8_t enable_3v3_out1;
	uint8_t enable_3v3_out2;
	uint8_t keep_pwr_state;
	uint8_t pwr_state;
    uint8_t is_data_storage_enable;
    uint32_t rain_period;
    uint8_t reserved;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
	uint16_t new_collect_cycle[UNP_MAX_RULES_WTS_NUM]; // 0:温度 1：风速 2：雨量 3：气压
} application_wts_t;

// #define MS_D2D_ACT_LEN       12
#define MS_D2D_MAX_NUM       16

// typedef struct d2d_slave_s {
// 	uint8_t enable;  /* 0:disable, 1:enable */
// 	uint16_t cmd;
// 	uint8_t action[MS_D2D_ACT_LEN];
// } d2d_slave_t;
#pragma pack(1)
typedef struct ws52x_d2d_slave_s {
	uint8_t enable;
	uint16_t cmd;
	uint8_t action[10]; //字符串类型，最多可以配置16个字符，即8字节
} ws52x_d2d_slave_t;

typedef struct application_ws52x_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t led_mode;
	uint8_t power_switch_mode;
	uint8_t socket_lock;
	uint8_t power_meter_enable;
	uint8_t over_current_protect_enable;
	uint8_t over_current_protect_threshold;
	uint8_t over_current_alarm_enable;
	uint8_t over_current_alarm_threshold;
    ws52x_d2d_slave_t d2d_cfg[MS_D2D_MAX_NUM];
} application_ws52x_t;

typedef struct motion_report_s {
    uint8_t enable;
    uint16_t period;
} motion_report_t;

typedef struct geo_fence_s {
    uint8_t enable;
    int32_t lon;
    int32_t lat;
    uint32_t radius;
    uint16_t interval;
    uint8_t times;
} geo_fence_t;

typedef struct at101_application_s {
    uint8_t report_mode;
    uint16_t report_cycle[3];
    motion_report_t motion_report;
    motion_check_t move;
    motion_check_t rest;
    uint16_t fixed_time[5];
    uint8_t locate_mode;
    uint8_t gnss_time;
    uint8_t wifi_time;
    uint8_t wifi_bssid_num;
    geo_fence_t geo_fence;
    uint8_t tilt;
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
} at101_application_t;

#pragma pack()
typedef struct application_ws30x_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
    uint8_t led_mode;
    uint16_t battery_cycle;
    uint8_t buzz_mode;
    uint16_t PIR_idle_interval;
    uint16_t jitter_time;
    uint8_t reserved[6];
    d2d_master_t d2d_cfg[2];
} application_ws30x_t;

typedef struct application_ws10x_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
    uint8_t led_mode;
    uint16_t battery_cycle;
    uint8_t buzz_mode;
    uint16_t PIR_idle_interval;
    uint16_t jitter_time;
    uint8_t double_click_enable;    //是否用双击
    uint8_t reserved[5];
    d2d_master_t d2d_cfg[3];
} application_ws10x_t;

typedef struct application_ws20x_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t led_mode;
    uint16_t battery_cycle;
    uint8_t buzz_mode;
    uint16_t PIR_idle_interval;
    uint16_t jitter_time;
    uint8_t reserved[6];
    d2d_master_t d2d_cfg[4];
} application_ws20x_t;

typedef struct application_em310_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t sleepmode;
	abnormal_check_set_t abnormal_check_set;
	uint8_t display_mode;
	abnormal_check_patch_set_t abnormal_check_patch_set;
	uint8_t led_mode;
    uint16_t battery_cycle;
    uint8_t linkage_switch;
} application_em310_t;

typedef struct application_em310_tilt_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t threshold_rule[8];
} application_em310_tilt_t;

typedef struct application_em320_tilt_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t threshold_rule[8];
} application_em320_tilt_t;

typedef struct application_em320_th_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t is_data_storage_enable;//0:disable,1:enable
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
} application_em320_th_t;

#pragma pack(1)

typedef struct application_em300_di_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t is_data_storage_enable;//0:disable,1:enable
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
	d2d_master_t d2d_cfg[6]; // D2D配置 0：停水超时  1：停水超时解除 2：流水超时 3：流水超时解除  4：高电平 5：低电平
} application_em300_di_t;

typedef struct application_em300_cl_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t is_data_storage_enable; // 0:disable,1:enable，历史记录使能
    uint8_t restransmit_enable;     // 配置重传功能是否使能
    uint16_t restransmit_period;    // 配置重传的周期，单位秒
    uint16_t storage_query_period;  // 查询数据的上传周期，单位秒
    uint8_t cycle_unit;             // 采集和上报定时器的单位 0:默认为分钟 1：秒
} application_em300_cl_t;

typedef struct application_ws201_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t is_data_storage_enable;	//unused
    uint8_t restransmit_enable;		//unused
    uint16_t restransmit_period;	//unused
    uint16_t storage_query_period;	//unused
} application_ws201_t;

typedef struct new_d2d_master_s {
    uint8_t enable;
    uint8_t uplink_lora;
    uint16_t cmd;
    uint16_t ctrl_time;
    uint8_t enable_ctrl_time;
} new_d2d_master_t;

typedef struct application_vs34x_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint16_t pir_idle_interval;
    uint16_t reserved[5];
    uint8_t led_mode;
    new_d2d_master_t d2d_set[2];
    uint8_t report_cycle_unit;
} application_vs34x_t;

typedef struct win_open_detect_cfg_s {
    uint8_t enable;
    int8_t threshold;
    uint16_t time;
} win_open_detect_cfg_t;

typedef struct auto_ctrl_cfg_s {
    int8_t target;
    int8_t error;
    int8_t range_min;
    int8_t range_max;
    win_open_detect_cfg_t win_open_detect;
} auto_ctrl_cfg_t;

typedef struct fixed_ctrl_cfg_s {
    uint8_t level;
} fixed_ctrl_cfg_t;

typedef struct valve_ctrl_cfg_s {
    uint8_t enable;
    uint8_t mode;
    auto_ctrl_cfg_t auto_ctrl;
    fixed_ctrl_cfg_t fixed_ctrl;
} valve_ctrl_cfg_t;

typedef struct frost_protect_cfg_s {
    uint8_t enable;
    int16_t threshold;
} frost_protect_cfg_t;

typedef struct date_format_s {
    uint8_t month;
    uint8_t day;
} date_format_t;

typedef struct heat_cycle_cfg_s {
    uint8_t enable;
    uint16_t period;
    date_format_t start;
    date_format_t end;
} heat_cycle_cfg_t;

typedef struct heat_rule_cfg_s {
    uint8_t enable;
    uint8_t mode;
    int8_t value;
    uint16_t period;
    uint16_t time;
    uint8_t mask;
} heat_rule_cfg_t;

typedef struct heat_plan_cfg_s {
    heat_cycle_cfg_t cycle;
    heat_rule_cfg_t rule[16];
} heat_plan_cfg_t;

typedef struct dst_time_s {
    uint8_t month;
    uint8_t week;
    uint16_t hour_min;
} dst_time_t;

typedef struct dst_cfg_s {
    uint8_t enable;
    uint8_t offset;
    dst_time_t start;
    dst_time_t end;
} dst_cfg_t;

typedef struct extend_ctrl_s {
    uint8_t enable;
    uint8_t timeout;
    uint8_t offline_mode;
} extend_ctrl_t;

typedef struct application_wt101_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t report_cycle_unit;
    uint8_t install_mode;
    valve_ctrl_cfg_t valve_ctrl;
    frost_protect_cfg_t frost_protect;
    heat_plan_cfg_t heat_plan;
    uint8_t children_lock;
    uint8_t algorithm;
    uint8_t valve_change_report_enable;
    uint8_t valve_open_win_mode;
    uint8_t valve_valid_ratio;
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    dst_cfg_t dst_cfg;
    uint8_t only_display_target;
    extend_ctrl_t extend_ctrl;
    uint8_t valve_valid_ratio_enable;
} application_wt101_t;

#define PLAN_MAX_TIME_NUM         16
#define MS_D2D_ACT_LEN            7
typedef struct tstat_timeout_s {
    uint8_t enable;
    uint8_t time;
} tstat_timeout_t;

typedef struct fan_timeout_s {
    uint8_t enable;
    uint16_t time;
} fan_timeout_t;

typedef struct tstat_ctrl_s {
    uint8_t system_status;  //0:off, 1:on
    uint8_t mode;
    uint8_t fan_mode;
    tstat_timeout_t fan_delay; //风扇延时时间
    uint8_t circulate_cycle;   //风扇通风时间
    uint8_t tar_temp[4];
    uint8_t glbl_error;
    uint8_t auto_error;
    uint8_t temp_max;
    uint8_t temp_min;
    uint8_t heat_cycle;
    uint8_t heat_threshold;
    uint8_t cool_cycle;
    uint8_t cool_threshold;
} tstat_ctrl_t;

typedef struct time_format_s {
    uint8_t enable;
    uint8_t week_mask;
    uint16_t hour_min;
} time_format_t;

typedef struct plan_cfg_s {
    uint8_t tstat_mode;
    uint8_t fan_mode;
    uint8_t tar_temp;
    uint8_t auto_error;
    time_format_t time[PLAN_MAX_TIME_NUM];
} plan_cfg_t;

// typedef struct dst_time_s {
//     uint8_t month;
//     uint8_t week;
//     uint16_t hour_min;
// } dst_time_t;

// typedef struct dst_cfg_s {
//     uint8_t enable;
//     uint8_t offset;
//     dst_time_t start;
//     dst_time_t end;
// } dst_cfg_t;

typedef struct sleep_time_cfg_s{
    uint8_t enable;
    uint16_t start_min; // h*60+m
    uint16_t end_min; // h*60+m
}sleep_time_cfg_t;

typedef struct wire_connection_s {
    uint8_t rc;    //0: no connection, 1: connection
    uint8_t rh;    //0: no connection, 1: connection
    uint8_t w1;    //0: no connection, 1: connection
    uint8_t w2_aux;//0: no connection, 1: w2, 2:aux
    uint8_t we;    //0: no connection, 1: connection
    uint8_t y1;    //0: no connection, 1: connection
    uint8_t y2_gl; //0: no connection, 1: y2, 2:gl
    uint8_t gh;    //0: no connection, 1: connection
    uint8_t ob;    //0: no connection, 1: connection
    uint8_t ob_on_cool;
    uint8_t fan_ctrl;//0：外部控制（炉、锅炉）1: 恒温器控制
    uint8_t heat_sys;//0: 炉，1：锅炉
    uint8_t di;    //0: no connection, 1: connection
    uint8_t pek;   //0: no connection, 1: connection
    uint8_t reserved[2];
} wire_connection_t;

typedef struct new_d2d_slave_s {
    uint8_t enable;  /* 0:disable, 1:enable */
    uint16_t cmd;
    uint8_t action[MS_D2D_ACT_LEN]; 
} new_d2d_slave_t;

typedef struct room_card_s {
    uint8_t enable;
    uint8_t object;     //0表示开关机，1表示插入计划
    uint8_t action;     //高四位表示插卡计划，第四位表示拔卡计划
    uint8_t invert;     //0表示正常，1表示反转
    uint8_t reserved[2];//预留
} room_card_t;

typedef struct temp_extend_s {
    uint8_t timeout;
    uint8_t enable;
    uint8_t reserved[2];
} temp_extend_t;

typedef struct humi_cfg_s {
    uint8_t enable;         //湿度范围检测使能
    uint8_t min;            //湿度最小值
    uint8_t max;            //湿度最大值
    uint8_t tstat_enable;   //温控除湿
    uint8_t tstat_error;    //温控除湿温度允差
    uint8_t fan_enable;     //风扇除湿
    uint8_t fan_time;       //每小时开启几分钟
} humi_cfg_t;

typedef struct wt201_application_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t report_cycle_unit;
    tstat_ctrl_t tstat_ctrl;
    tstat_timeout_t tstat_timeout[3];  //0辅助制热超时，1紧急制热超时，2压缩机保护时间
    plan_cfg_t heat_plan[4]; //0wake，1away，2home，3sleep
    dst_cfg_t dst_cfg;
    wire_connection_t wire_connection;
    frost_protect_cfg_t frost_protect;
    uint8_t hour_system;
    uint8_t children_lock;
    new_d2d_master_t d2d_ctrl[4];  //0wake，1away，2home，3sleep
    new_d2d_slave_t d2d_agent[16];
    room_card_t room_card;
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    temp_extend_t temp_extend;
    humi_cfg_t humi_cfg;
    uint8_t tstat_owner;
    uint8_t offline_ctl;
} wt201_application_t;

#define D2D_TH_ID_NUM      5
#define D2D_TH_ID_LEN      8
#define D2D_TH_NAME_LEN    8
#define MS_D2D_MASTER_MAX  4
#define MS_D2D_SLAVE_MAX   16

typedef struct d2d_list_s {
    uint8_t id[D2D_TH_ID_LEN];
    uint8_t name[D2D_TH_NAME_LEN];
} d2d_list_t;

typedef struct d2d_match_s {
    uint8_t enable;
    d2d_list_t list[D2D_TH_ID_NUM];
} d2d_match_t;

typedef struct double_set_cfg_s {
    uint8_t enable;
    int16_t temp[2];    // 0:heat 1:cool
    int16_t error[2];   // 0:heat 1:cool
} double_set_cfg_t;

typedef struct tstat_ctrl_v2_s {
    uint8_t system_status;  //0:off, 1:on
    uint8_t mode;
    uint8_t fan_mode;
    fan_timeout_t fan_delay; //风扇延时时间
    uint8_t circulate_cycle;   //风扇通风时间
    uint16_t tar_temp[4];
    uint8_t glbl_error;
    uint8_t auto_error;
    uint16_t temp_max[4];
    uint16_t temp_min[4];
    uint8_t heat_cycle;
    uint8_t heat_threshold;
    uint8_t cool_cycle;
    uint8_t cool_threshold;
    uint8_t target_resolution;
    uint8_t delta[2];
    uint8_t yaux_enable;
    uint8_t ob_on_cool;
    uint8_t setback_enable;
    uint8_t setforw_enable;
    double_set_cfg_t double_set_cfg;
    uint8_t ctrl_mode_enable_mask; //bit0:heat bit1:em_heat bit2:cool bit3:auto
    uint8_t reserved;
} tstat_ctrl_v2_t;

typedef struct plan_cfg_v2_s {
    uint8_t tstat_mode;
    uint8_t fan_mode;
    uint16_t tar_temp;
    uint8_t trgt_error;
    uint8_t auto_error;
    time_format_t time[PLAN_MAX_TIME_NUM];
    int16_t double_set_temp[2];   // 0:heat 1:cool
    int16_t double_set_error[2];  // 0:heat 1:cool
} plan_cfg_v2_t;

typedef struct wire_connection_v2_s {
    uint8_t rc;    //0: no connection, 1: connection
    uint8_t rh;    //0: no connection, 1: connection
    uint8_t w1;    //0: no connection, 1: connection
    uint8_t w2_aux;//0: no connection, 1: w2, 2:aux
    uint8_t we;    //0: no connection, 1: connection
    uint8_t y1;    //0: no connection, 1: connection
    uint8_t y2_gl; //0: no connection, 1: y2, 2:gl
    uint8_t gh;    //0: no connection, 1: connection
    uint8_t ob;    //0: no connection, 1: connection
    uint8_t fan_ctrl;//0：外部控制（炉、锅炉）1: 恒温器控制
    uint8_t heat_sys;//0: 炉，1：锅炉
    uint8_t di;    //0: 无，1：有
    uint8_t pek;   //0: 无，1：有
    uint8_t reserved[2];
} wire_connection_v2_t;

typedef struct lock_ctrl_s {
    uint8_t mask;
    uint16_t time;
} lock_ctrl_t;

typedef struct wt201_application_v2 {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t report_cycle_unit;
    uint8_t collect_cycle_unit;
    tstat_ctrl_v2_t tstat_ctrl;
    tstat_timeout_t tstat_timeout[3];  //0辅助制热超时，1紧急制热超时，2压缩机保护时间
    plan_cfg_v2_t heat_plan[7]; //0wake，1away，2home，3sleep
    dst_cfg_t dst_cfg;
    wire_connection_v2_t wire_connection;
    frost_protect_cfg_t frost_protect;
    uint8_t hour_system;
    uint8_t children_lock;
    new_d2d_master_t d2d_ctrl[7];  //0wake，1away，2home，3sleep
    new_d2d_slave_t d2d_agent[MS_D2D_SLAVE_MAX];
    room_card_t room_card;
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    temp_extend_t temp_extend;
    humi_cfg_t humi_cfg;
    uint8_t tstat_owner;         //0内部控制，1远程控制
    uint8_t offline_ctl;
    uint8_t screen_disable;      //0使能，1禁用计划显示，2禁用整个屏幕
    uint8_t hac_enable;          //bit0表示Y2是否为辅助空能，bit1表示W2是否为辅助空能，其它位保留
    uint8_t relay_change_report; //0不上报，1上报
    d2d_match_t d2d_match;
    lock_ctrl_t lock_ctrl;
} wt201_application_v2_t;

typedef struct wt201_alarm_params_s {
    new_alarm_rules_t rules[3];
} wt201_alarm_params_t;

typedef struct {
	new_alarm_rules_t rules[3];
} alarm_params_vs350_tilt_t;

typedef struct {
	new_alarm_rules_t rules[3];
} alarm_params_vs351_tilt_t;

typedef struct {
	new_alarm_rules_t rules[2];
} alarm_params_vs360_tilt_t;

typedef struct alarm_params_vs321_s {
    new_alarm_rules_t rules[3];
} alarm_params_vs321_t;

typedef struct user_config_vs321_s {
    vs321_sensor_config_t sensor_cfg;
} user_config_vs321_t;

typedef struct wt201_user_config_s {
    new_sensor_cfg_t sensor_cfg[2];
} wt201_user_config_t;

typedef struct ws203_d2d_master_s {
    uint8_t enable;
    uint8_t uplink_lora;
    uint16_t cmd;
    uint16_t ctrl_time;
    uint8_t enable_ctrl_time;
} ws203_d2d_master_t;

typedef struct application_ws203_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
	uint8_t report_cycle_unit;
    uint8_t led_mode;
    uint16_t PIR_idle_interval;
    ws203_d2d_master_t d2d_set[5];
    uint8_t is_data_storage_enable;
	uint8_t restransmit_enable;
	uint8_t restransmit_period;
	uint8_t storage_query_period;
} application_ws203_t;
#pragma pack()

#pragma pack(1)
typedef struct application_ts101_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t is_data_storage_enable;	
    uint8_t restransmit_enable;		
    uint16_t restransmit_period;	
    uint16_t storage_query_period;	
} application_ts101_t;
#pragma pack()

#pragma pack(1)
typedef enum ts201_d2d_master_id_e {
    TS201_D2D_MASTER_ID_TEMPERATURE_OCCUR,       //温度阈值触发
    TS201_D2D_MASTER_ID_TEMPERATURE_RECOVER,     //温度阈值解除
    TS201_D2D_MASTER_ID_TEMPERATURE_SALATION,    //温度突变阈值触发
    TS201_D2D_MASTER_ID_HUMIDITY_OCCUR,          //湿度阈值触发
    TS201_D2D_MASTER_ID_HUMIDITY_RECOVER,        //湿度阈值解除
    TS201_D2D_MASTER_ID_HUMIDITY_SALATION,       //湿度突变阈值触发
    TS201_D2D_MASTER_ID_MAX
} ts201_d2d_master_id_t;

typedef struct ts201_d2d_master_s {
    uint8_t enable;
    uint8_t uplink_lora;
    uint16_t cmd;
    uint16_t ctrl_time;
    uint8_t enable_ctrl_time;
} ts201_d2d_master_t;

typedef struct sensor_data_enable_s {
    uint8_t temp_enable:1;
    uint8_t humi_enable:1;
    uint8_t reserved:6;
} ts201_sensor_data_enable_t;

typedef struct ts201_d2d_data_sender_s {
    uint8_t enable;
    uint8_t uplink_lora;
    ts201_sensor_data_enable_t sensor_data_enable;   
} ts201_d2d_data_sender_t;

typedef struct ts201_button_lock_s {
    uint8_t power_off_enable:1;         // 0:disable,1:enable, 按键关机功能
    uint8_t collect_report_enable:1;    // 0:disable,1:enable, 按键采集上报功能
    uint8_t reserved:6;
}ts201_button_lock_t;

typedef struct application_ts201_s {
    uint16_t    collect_cycle;          // 采集周期
    uint16_t    report_cycle;
    uint8_t     report_cycle_unit;      //0:秒 1:分钟
    uint8_t     is_data_storage_enable; // 0:disable,1:enable，历史记录使能
    uint8_t     restransmit_enable;     // 配置重传功能是否使能
    uint16_t    restransmit_period;     // 配置重传的周期，单位秒
    uint16_t    storage_query_period;   // 查询数据的上传周期，单位秒
    uint8_t     collect_cycle_unit;     //0:秒 1:分钟
    uint8_t     retry_cnt;              //lora ack 重发次数 ID重发次数
    ts201_d2d_master_t d2d_master[TS201_D2D_MASTER_ID_MAX];
    ts201_d2d_data_sender_t d2d_data_sender;
    ts201_button_lock_t button_lock;
    uint8_t     alarm_led_enable;       // 0:disable,1:enable，报警指示灯
} application_ts201_t;
#pragma pack()

#pragma pack(1)
typedef struct application_ts30x_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t report_cycle_unit;  //0: 秒 1:分钟
    uint8_t is_data_storage_enable;//0:disable,1:enable
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    uint8_t lock_button;//按键锁;0:不使用;1:使用按键锁
    uint32_t buffeting_time;//门磁上报防抖时间 ms
    uint8_t hourly_system;//24小时&12小时切换;1:24小时;0:12小时
    uint8_t display_enbale;//0:disable,1:enable
} application_ts30x_t;
#pragma pack()

#pragma pack(1)
typedef struct application_em300_e {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t is_data_storage_enable; // 0:disable,1:enable，历史记录使能
    uint8_t restransmit_enable;     // 配置重传功能是否使能
    uint16_t restransmit_period;    // 配置重传的周期，单位秒
    uint16_t storage_query_period;  // 查询数据的上传周期，单位秒
    d2d_master_t d2d_cfg[5];
} application_em300_t;
#pragma pack()

#pragma pack(1)
typedef struct application_ds3604_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t template_id;
    uint8_t buzz_mode;
    uint8_t least_refresh_day;
    uint8_t screen_button;
} application_ds3604_t;

typedef struct screen_mask_s {
    uint8_t enable;          //0x55:enable, other:disable
    uint16_t status;
} screen_mask_t;

typedef struct {
// 应用程序信息表
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t display_mode;//1:mode1,2:mode2,3:mode3
    uint8_t background_color;//0:white,1:black
    uint8_t led_mode;//0:disable,1:normally on,2:blink
    uint8_t is_screen_smart_enable;//0:disable,1:enable
    uint8_t is_display_enable;//0:disable,1:enable
    uint8_t is_data_storage_enable;//0:disable,1:enable
    uint8_t is_enable_time_sync;//0:disable,1:enable
    uint8_t buzz_mode;//0:不启用,1:启用
    uint8_t is_co2_abc_enable;//0:不启用,1:启用
    uint8_t is_buzz_stop_enable;//0:不启用蜂鸣器中止,1:启用蜂鸣器中止
    uint8_t button_lock_mode; //0:按键锁禁用，1：禁用切换屏幕，2：禁用开关机，3：两者都禁用
    uint8_t is_screen_alarm_enable;
    screen_mask_t screen_switch_mask;
    uint8_t pressure_compensation_enable;
    uint16_t pm_collect_period;
    uint32_t rain_period;
    uint8_t retransmit_enable;
    uint16_t retransmit_period;
    uint16_t storage_query_period;
    uint8_t sps30_fan_auto_clean_enable; //SPS30风扇自动清洁使能
    uint8_t sps30_fan_auto_clean_period; //SPS30风扇自动清洁周期 单位:天
} application_am319_t;

#pragma pack()

#pragma pack(1)
typedef struct d2d_slave_s {
	uint8_t enable;
	uint16_t cmd;
	uint8_t action[17]; //字符串类型，最多可以配置16个字符，即8字节
} d2d_slave_t;

typedef struct d2d_slave_ws50x_s {
	uint8_t enable;
	uint16_t cmd;
	uint8_t action[12]; //字符串类型，最多可以配置16个字符，即8字节
} d2d_slave_ws50x_t;

typedef struct d2d_master_ws50xc_s {
	uint8_t  mode;
	uint16_t cmd; //两个字节，取值范围0x0000~0xffff
} d2d_master_ws50x_t;
#define MS_D2D_MAX_KEY       3
typedef struct application_ws50x_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t led_mode;
	uint8_t power_switch_mode;
	uint8_t proximity_enable;
	uint8_t d2d_extend_enable;  /* added by wangbe */
	d2d_slave_ws50x_t d2d_cfg[16];  /* added by wangbe */
	uint8_t power_meter_enable;
	uint8_t key_reset_locked;
	uint8_t key_onoff_locked;
	d2d_master_ws50x_t d2d_master[MS_D2D_MAX_KEY];
} application_ws50x_t;

typedef struct application_ws55x_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t led_mode;
	uint8_t power_switch_mode;
	uint8_t socket_lock;
	uint8_t power_meter_enable;
	uint8_t over_current_protect_enable;
	uint8_t over_current_protect_threshold;
	uint8_t over_current_alarm_enable;
	uint8_t over_current_alarm_threshold;
	uint8_t reserved[6];
	uint8_t d2d_extend_enable;
	d2d_slave_t d2d_cfg[16];
} application_ws55x_t;

typedef struct application_ws156_s {
	uint16_t collect_cycle;
	uint16_t report_cycle;
	uint8_t led_mode;
	uint16_t battery_alarm_cycle;
	uint8_t battery_alarm_enable;
	uint8_t delay_send;
	uint8_t switch_mode;
	uint8_t reserved[4];
	d2d_master_t d2d_cfg[6];
	d2d_master_t d2d_cfg_double[6];
	d2d_master_t d2d_cfg_long[6];
} application_ws156_t;

typedef struct polarization_parameter {
    uint16_t time;
    uint8_t flag;
} polarization_parameter_t;             //用户配置：对接toolbox

typedef struct {
    uint8_t enable;
    uint8_t device;                     // 0:Sensor0 1:Sensor1
    uint8_t type;                       // 0:clear 1:set
    uint16_t value;                     // 0:zero calibration >1:user calibration
} calibration_t;

typedef struct {
// 应用程序信息表
    uint16_t collect_cycle;
    uint16_t report_cycle;              //上报周期
    uint8_t led_enable;                 //使能led灯
    uint8_t buzzer_enable;              //使能蜂鸣器
    uint16_t exceed_collect_cycle;      //超阈值采集周期
    uint8_t d2d_exceed_cmd[2];          //d2d超阈值命令
    uint8_t d2d_noexceed_cmd[2];        //d2d未超阈值命令
    polarization_parameter_t polarization;
    calibration_t calibration;
} application_gs301_t;

typedef struct {
// 应用程序信息表
    uint16_t collect_cycle;             //采集周期
    uint16_t report_cycle;              //上报周期
    uint16_t continue_time;             //测试模式持续时间
    uint16_t body_height;               //人体存在高度
    uint8_t  test_enable;               //测试模式使能
    uint8_t scheme;                     //方案
    struct backside_parameter {
        uint8_t  enable;                //被装使能
        uint16_t  distance;             //背装触发距离
    } backside;  //背装相关参数
} application_vs330_t;

typedef struct alarm_config {
    uint8_t enable;                     //开启报警设置使能
    uint16_t time;                      //配置警报间隔（默认1分钟，>=上报周期）
    uint16_t max_count;                 //警报次数(默认2次，可配置2-1000次)
} ws303_alarm_config_t;

typedef struct buzz_config {
    uint8_t enable;                     //蜂鸣器使能
    uint8_t looked_device;              //寻找设备(0:不寻找；1寻找)
    uint16_t time;                      //寻找设备时间(默认5分钟，可配置1-1080分钟)
    uint8_t ruing;                      //鸣响标志,用于中止（0：不能中止蜂鸣器，1可中止蜂鸣器）
} ws303_buzz_config_t;

typedef struct d2d_config {
    uint8_t state;                      //d2d命令使能 0使用lora,1使用D2D,2使用lora+D2D
    uint16_t cmd;                       //d2d命令
} d2d_config_t;

typedef struct application_ws303_s{
    uint16_t collect_cycle;             //采集周期
    uint16_t report_cycle;              //上报周期(默认1080分钟，可配置1-1080分钟)
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    d2d_config_t d2d[2];                //0:不漏水；1：漏水
    ws303_buzz_config_t buzz;                 //蜂鸣器相关参数配置
    ws303_alarm_config_t alarm;               //告警相关参数配置
} application_ws303_t;

typedef struct alarm_params_e {
	alarm_rules_t rules[UNP_MAX_RULES_NUM];
} alarm_params_t;//10


typedef struct alarm_params_wts {
	alarm_rules_wts_t rules[UNP_MAX_RULES_WTS_NUM];
} alarm_params_t_wts;

/*-------------------------------------规则引擎裁剪后相关结构体----------------------------------*/
#define RULE_CHANNELS 16
/*---------------------------------------------------------------------*/

#pragma pack()
/* 触发条件——阈值 */
typedef struct threshold_condition_s {
    uint8_t mode;
    float min_value;			// 最小值 、 变化值
    float max_value;			// 最大值
} alarm_rules_rule;


typedef struct cut_rule_config {
	uint8_t enable;
	uint8_t rule_id;
	alarm_rules_rule thr_condition;
} cut_rule_config_t;

typedef struct alarm_rule_e {
	cut_rule_config_t rule[RULE_CHANNELS];
} rule_config_t;

#pragma pack(1)

// 霍尔新增
typedef struct flow_threshold_s {
	uint8_t enable;          // 水流阈值总使能
	uint16_t decision_time;  // 检测状态时间间隔，单位s
	struct flow_alarm_s {
		uint8_t enable;             // 0:disable,1:enable 
		uint32_t excess_value;      // CONFIGURE_FLOW：0 :流水超时时间间隔，单位min 
									// CONFIGURE_FLOW：1 :停水超时时间间隔，单位min 
	} flow_alarm_t[2];
} flow_threshold_t;

// 数字量的报警设置
typedef struct digital_alarm_setting_s {    
	uint8_t enable;
	uint8_t alarm_item;             // 报警项 0：低电平→高电平 1：高电平→低电平 2：低电平→高电平&高电平→低电平
	uint16_t alarm_interval;        // 报警间隔
	uint16_t alarm_frequency;        // 报警次数
} digital_alarm_setting_t;

typedef struct {
    alarm_rules_t rules[1];
} ws203_alarm_params_t;

typedef struct {
	uint8_t mode;
	int16_t max_value;
	int16_t min_value;
	uint16_t continue_time;
	uint16_t lock_time;
	uint8_t enable;
	int16_t max_value2;
	int16_t min_value2;
} am2xx_alarm_rules_t;

typedef struct {
    am2xx_alarm_rules_t rules[6];

} am319_alarm_params_t;//10

typedef struct {
	am2xx_alarm_rules_t rules[3];
} alarm_params_em310_tilt_t;

typedef struct {
	am2xx_alarm_rules_t rules[3];
} alarm_params_ws201_t;

typedef struct {
    struct alarm_rules {
        uint8_t enable;
        uint16_t alarm_time;  // 间隔 无用
        uint16_t alarm_count; // 报警次数
    } rules[1];
} alarm_params_em300_cl_t;

typedef struct {
	am2xx_alarm_rules_t rules[1];
	flow_threshold_t flow_alarm;
	digital_alarm_setting_t digital_alarm;
} alarm_params_em300_di_t;

typedef struct {
	alarm_rules_t rules[4];
} alarm_params_ts30x_t;

typedef struct {
	am2xx_alarm_rules_t rules[3];
} alarm_params_em320_tilt_t;

typedef struct {
    uint8_t mode;
    int16_t max_value;
    int16_t min_value;
    uint16_t continue_time;
    uint16_t lock_time;
    uint8_t enable;
    int16_t max_value2;
    int16_t min_value2;
} em400_alarm_rules_t;

typedef struct {
    em400_alarm_rules_t rules[2];
} em400_alarm_params_t;

typedef struct {
    em400_alarm_rules_t rules[2];
} em400_nb_alarm_params_t;

typedef struct {
    uint8_t mode;
    int16_t max_value;
    int16_t min_value;
    uint16_t continue_time;
    uint16_t lock_time;
    uint8_t enable;
    int16_t max_value2;
    int16_t min_value2;
} em400_nb_alarm_rules_t;

typedef struct {
	uint8_t mode;
	int16_t max_value;
	int16_t min_value;
	uint16_t continue_time;
	uint16_t lock_time;
	uint8_t enable;
	int16_t max_value2;
	int16_t min_value2;
} gs301_alarm_rules_t;

typedef struct {
    gs301_alarm_rules_t rules[9];
} gs301_alarm_params_t;//10

typedef struct lora_mc_group_v1_s {
	uint8_t mode;
	uint32_t dev_addr;
	uint8_t mc_nwks_key[16];
	uint8_t mc_apps_key[16];
} lora_mc_group_v1_t;

typedef struct lora_mc_cfg_v1_s {
	uint8_t rxparam_custom;
	uint8_t datarate;
	uint32_t frequency;
	uint8_t GenAppKey[16];
	lora_mc_group_v1_t group[4];
} lora_mc_cfg_v1_t;

typedef struct lora_mc_group_v2_s {
	uint8_t mode;
	uint8_t ping_slot_period;
	uint8_t datarate;
	uint32_t frequency;
	uint32_t dev_addr;
	uint8_t mc_nwks_key[16];
	uint8_t mc_apps_key[16];
	uint8_t reserved[2];
} lora_mc_group_v2_t;

typedef struct lora_mc_cfg_v2_s {
	uint8_t GenAppKey[16];
	uint8_t reserved[4];
	lora_mc_group_v2_t group[4];
} lora_mc_cfg_v2_t;

typedef union mc_cfg_u {
	lora_mc_cfg_v1_t v1;
	lora_mc_cfg_v2_t v2;
} mc_cfg_t;


typedef struct status_s {
	uint8_t Resverd3[10];
	uint32_t uptime;
	uint32_t battery_consume;
	uint32_t battery_left;
	uint16_t co2_err_count;
	uint8_t co2_status;
} status_t;

typedef struct d2d_s {
	uint8_t d2d_key[16];
	uint32_t d2d_freq;
	uint8_t d2d_dr;
	uint8_t d2d_enable;
    uint8_t d2d_enable_master;
	uint8_t Resverd3[2];
} d2d_t;

typedef union common_u {
	status_t status;
	d2d_t d2d;
} common_t;

typedef struct LoRaWANParams_e {
  uint8_t mode;				// 0: CLASS_A, 1:CLASS_B, 2:CLASS_C
	uint8_t ota;				//  0: OTA, 1: ABP
	uint8_t adr;				//  0: OFF, 1: ON
	uint32_t NetID;
	uint32_t DevAddr;
	uint8_t DevEui[8];
	uint8_t AppEui[8];
	uint8_t NwkSKey[16];
	uint8_t AppSKey[16];
	uint8_t AppKey[16];
	uint32_t RxWinDelay1;
	uint32_t RxWinDelay2;
	uint32_t JoinDelay1;
	uint32_t JoinDelay2;
	uint8_t TxPower;
	uint8_t AppPort;
	uint8_t Confirm;
	uint16_t ChanMask[6];
	uint8_t Freq[80];		// Freq:0-3B; Dr:4B; 5*n(n=16)80
	uint8_t DefDr;
	uint32_t Win2Feq;
	uint8_t Win2Dr;
	uint32_t globalDutyRate;
	uint8_t DutyCycleOn;
	uint8_t JoinRetries;
	uint8_t RetriesTx;
	uint32_t AckTimeout;
	uint8_t LinkCheck;
	uint8_t SyncWord;
	uint8_t region;
	uint8_t gw_value[6];
	uint8_t single_channel_mode;
	uint8_t Resverd1;
	uint8_t DtuPort;
	uint8_t linkwan_freq_mode;
	uint8_t version;
	uint8_t max_confirm_num;
	uint8_t rejoin_mode;
    uint8_t as923_plan_support;
	uint8_t as923_plan;
	uint8_t ping_slot_period;
	uint8_t gw_specify;
	uint8_t mc_cfg_version;
	common_t common;
	mc_cfg_t mc_cfg;
	uint8_t Resverd[605];
	uint32_t UpLinkCounter;
	uint32_t DownLinkCounter;
} LoRaWANParams_t;//1032


#define UNP_MQTT_TOPIC_LEN    63
#define UNP_MQTT_CLIENTID_LEN 63
#define UNP_MQTT_USERNAME_LEN 31
#define UNP_MQTT_PASSWORD_LEN 128

typedef struct mqtt_topic_s {
	uint8_t name[UNP_MQTT_TOPIC_LEN + 1];
	uint8_t qos;
	uint8_t enable;
} mqtt_topic_t;

typedef struct app_mqtt_e {
	uint8_t mqtt_enable_tls;
	uint8_t mqtt_enable_auth;
	uint8_t clientid[UNP_MQTT_CLIENTID_LEN + 1];
	uint8_t username[UNP_MQTT_USERNAME_LEN + 1];
	uint8_t password[UNP_MQTT_PASSWORD_LEN + 1];
	uint32_t connect_timeout;
	uint32_t keepalive_interval;
	mqtt_topic_t topic[2];    //0上行 1下行
} app_mqtt_t;

typedef struct {
	uint8_t platform;//CTWING,ONENET,HUAWEI-OC
	uint16_t register_network_time;
	uint8_t domain_or_ip[64];               //服务器名称
	uint8_t apn[32];
	uint8_t apn_user[32];
	uint8_t apn_password[32];
	uint32_t uptime;
	uint32_t battery_consume;
	uint32_t battery_left;
	uint8_t CSQ;
	char IMEI[16];  //IMEI长度固定15
	char IMSI[16];  //IMSI长度固定15
	char ICCID[24]; //ICCID长度固定20
	uint8_t network_status;//网络状态
	uint32_t reserved[4];
	uint8_t had_registered;  //0:正在注网,1:注过网但失败了，2：注过网且成功了
	uint16_t server_port;    //服务器端口
	uint8_t reserved2[4];
	app_mqtt_t mqtt;
}NBParams_t;

typedef struct flash_flag {
	params_lock_t lockflag1;
	params_lock_t lockflag2;
	uint8_t 	  readflag1;
	uint8_t       readflag2;
	uint32_t      crc_bak_upgrade;
	uint32_t	  crc_bak_flash;
	params_lock_t lockflag3;
	uint8_t       readflag3;
	uint8_t		  upgrade_enable;
} flash_flag_t;

typedef struct d2d_master_vs350_s {
	uint8_t enable;
    uint8_t uplink_lora;
    uint16_t cmd;
    uint16_t ctrl_time;
    uint8_t enable_ctrl_time; 
} d2d_master_vs350_t;

typedef struct application_vs350_s{
	uint16_t collect_cycle;
    uint16_t report_cycle;                         /* 上报周期时间 */  
    uint8_t  reset_Cumulative_Value_enable;        /* 是否启用重置累计值功能 */ 
    uint16_t reset_interval_cycle;                 /* 重置间隔 */   
    uint8_t  is_data_storage_enable;               /* 是否启用历史数据存储功能 */	
    uint8_t  report_cumulative_value_enble;        /* 是否上报累计人数值 */   
 	uint8_t  report_temperature_enable;            /* 是否上报温度 */    
    uint8_t  restransmit_enable;                   /* 是否启用历史数据重传 */					 
    uint16_t restransmit_period;                   /* 历史重传间隔 */  
    uint16_t storage_query_period;                 /* 存储周期 */
	uint8_t  reset_cycle_people;                   /* 0:没有清零动作 1:状态页重置累计进入人数，2累计离开人数，4两个都重置 */  
    uint8_t  report_model;                         /* 上报模式 0：整点上报，1：即刻上报 */
    d2d_master_vs350_t d2d_cfg[5];    			   /* D2D */
}application_vs350_t;

typedef struct d2d_master_vs351_s {
	uint8_t enable;
    uint8_t uplink_lora;
    uint16_t cmd;
    uint16_t ctrl_time;
    uint8_t enable_ctrl_time; 
} d2d_master_vs351_t;

typedef struct application_vs351_s{
    uint16_t collect_cycle;
    uint16_t report_cycle;                      /* 上报周期时间 */
    uint8_t  is_data_storage_enable;            /* 是否启用历史数据存储功能 */
    uint8_t  restransmit_enable;                /* 是否启用历史数据重传 */
    uint16_t restransmit_period;                /* 历史重传间隔 */  
    uint16_t storage_query_period;              /* 存储周期 */
    uint8_t  enable_reset_cumulative_value;     /* 是否启用重置累计值功能 */
    uint8_t  reset_cumulative_value_week;       /* 重置累计值星期 */
    uint8_t  reset_cumulative_value_hour;       /* 重置累计值小时点 */
    uint8_t  reset_cumulative_value_minute;     /* 重置累计值分钟点 */
    uint8_t  enable_report_cumulative_value;    /* 是否启用上报累计值功能 */
    uint8_t  enable_report_temperature_value;   /* 是否启用上报温度值功能 */
    uint8_t  enable_hibernate_mode;             /* 是否启用休眠模式功能 */
    uint8_t  set_into_hibernate_hour;           /* 设置进入休眠模式小时点 */
    uint8_t  set_into_hibernate_minute;         /* 设置进入休眠模式分钟点 */
    uint8_t  set_exit_hibernate_hour;           /* 设置退出休眠模式小时点 */
    uint8_t  set_exit_hibernate_minute;         /* 设置退出休眠模式分钟点 */
    uint8_t  set_detection_direction;           /* 设置检测方向 */
    uint16_t set_mounting_height;               /* 设置安装高度 */
    d2d_master_vs351_t  d2d_cfg[5];    			/* D2D */
    uint8_t  set_installation_scene;            /* 设置安装场景 */
    uint8_t  report_model;                      /* 上报模式 0：整点上报，1：即刻上报 */
}application_vs351_t;

typedef struct application_vs360_s{
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t  is_data_storage_enable;
    uint8_t  restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    uint8_t  enable_reset_cumulative_value;     /* 是否启用重置累计值功能 */
    uint8_t  reset_cumulative_value_week;       /* 重置累计值星期 */
    uint8_t  reset_cumulative_value_hour;       /* 重置累计值小时点 */
    uint8_t  reset_cumulative_value_minute;     /* 重置累计值分钟点 */
    uint8_t  enable_report_cumulative_value;    /* 是否启用上报累计值功能 */
    uint8_t  enable_hibernate_mode;             /* 是否启用休眠模式功能 */
    uint8_t  set_into_hibernate_hour;           /* 设置进入休眠模式小时点 */
    uint8_t  set_into_hibernate_minute;         /* 设置进入休眠模式分钟点 */
    uint8_t  set_exit_hibernate_hour;           /* 设置退出休眠模式小时点 */
    uint8_t  set_exit_hibernate_minute;         /* 设置退出休眠模式分钟点 */
    uint8_t  set_slave_send_model;              /* 设置从机的发射模式 1.标准模式：15ms、2.高精度模式：10ms */
    uint8_t  oled_enable_controls;              /* oled开关控制 0：关闭/ 1:启用 */
    d2d_master_vs350_t  d2d_cfg[3];             /* d2d配置，id:0 有人进入 id:1 有人离开 id:2 人数阈值触发 */
    uint8_t  report_model;                      /* 上报模式 0：整点上报，1：即刻上报 */
}application_vs360_t;

typedef struct application_vs370_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t collect_cycle_unit; // 0:秒 1:分钟
    uint8_t report_cycle_unit; // 0:秒 1:分钟
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    sleep_time_cfg_t sleep_time[2];
    dst_cfg_t dst_cfg;
    uint8_t illumination_enable;
    uint16_t PIR_idle_interval;  // 1~60  unit: min
    uint8_t radar_sensitivity_level; //0: 低  1: 中  2: 高
    uint8_t pir_sensitivity_level; //0: 低  1: 中  2: 高
    new_d2d_master_t d2d_ctrl[6];
    uint8_t ble_enable;
    uint16_t lux_upper_limit;
    uint16_t lux_lower_limit;
    uint8_t pir_windows_time;
    uint8_t pir_pulse_count;
} application_vs370_t;

typedef struct region_polygon_s {
    uint8_t  regionId;                  // 区域ID
    uint8_t  enable;                    // 区域使能
    uint8_t  used_point_num;            // 区域使用的点个数
    uint16_t pointX[8];                 // 区域顶点X坐标
    uint16_t pointY[8];                 // 区域顶点Y坐标
} region_polygon_t;

typedef struct application_vs321_s {
    uint16_t collect_cycle;
    uint16_t report_cycle;
    uint8_t collect_cycle_unit; // 0:秒 1:分钟
    uint8_t report_cycle_unit;  // 0:秒 1:分钟
    uint8_t is_data_storage_enable;
    uint8_t restransmit_enable;
    uint16_t restransmit_period;
    uint16_t storage_query_period;
    uint8_t  enable_hibernate_mode;                 /* 是否启用休眠模式功能 */
    uint8_t  set_into_hibernate_hour;               /* 设置进入休眠模式小时点 */
    uint8_t  set_into_hibernate_minute;             /* 设置进入休眠模式分钟点 */
    uint8_t  set_exit_hibernate_hour;               /* 设置退出休眠模式小时点 */
    uint8_t  set_exit_hibernate_minute;             /* 设置退出休眠模式分钟点 */
    uint8_t  report_model;                          /* 上报模式 0：整点上报，1：即刻上报 */
    uint8_t  detectionfunction;                     /* 检测功能 0:人数统计， 1：工位占用*/
    uint8_t  detectionMode;                         /* 检测模式 0：PIR触发， 1：自动周期*/
    uint16_t  detectionInterval;                    /* 检测周期：默认2min */
    uint8_t  pirsensitivity;                        /* PIR灵敏度 */
    uint8_t ble_enable;                             /* ble使能配置 */
    dst_cfg_t dst_cfg;                              /* 夏令时配置 */
    d2d_master_vs350_t  d2d_cfg[20];                /* d2d配置 */
    region_polygon_t  region_cfg[10];               /* 检测区域配置 */
    uint16_t detectionLowestLuxValue;               /* 检测的最低光敏值 */
} application_vs321_t;

/*************************************** UC50X-NB START*****************************************/
typedef enum {
	SERVER_NONE = 0,
    SERVER_UDP,
    SERVER_TCP,
    SERVER_AWS,
	SERVER_MQTT,
    SERVER_IOT_CLOUD,   //星纵云
} Server_Type_e;

// 常规 -> 模拟量输入
#define UNP_MAX_AI_NUM    2
#define UNP_DOMAIN_IP_MAX_LEN   128
#define UNP_MODBUS_MAX_CHAN     16

typedef struct {
    uint16_t report_cycle;                 //上报周期  单位：分钟
    uint32_t collect_cycle;                //采集周期  单位：秒
    uint8_t  report_count;                 //累计次数--采集多少次后统一上报
    uint8_t  storage_enable;       //是否开启数据存储 0:否 1:是
    uint8_t  keep_power_state;             // 是否上电保持开机 0:保持关机 1:保持开机 2:与上次一样   mib_params.h中存储了开机状态 device_state
    uint8_t  battery_protect;              // 是否开启电池低温保护 0:不保护 1:保护
    uint8_t  work_mode;                    // 0:低功耗(NB断电) 1:低延时(eDRX)

    // retransmit和query的区别：retransmit是离线采集的数据重传，query是服务器主动查询的数据重传
    uint8_t  restransmit_enable;          // 是否允许离线采集的数据重传 0:否 1:是
    uint16_t restransmit_period;          // 重传的周期--上传失败后多久再传，单位秒
    uint16_t storage_query_period;        // 服务器查询数据的上传周期（即数据量太大时，间隔多久发送一次数据，直到发完），单位秒
} General_Base_Config_t;

typedef struct {
    uint8_t enable;                       //是否开启
    uint8_t mode;                         //模式  0:4-20mA电流  1:0~10v电压  (AI_Mode_t)
    float   current_osh;                  //电流量程上限
    float   current_osl;                  //电流量程下限
    uint8_t current_unit[8];              //测量结果单位
    float   voltage_osh;                  //电压量程上限
    float   voltage_osl;                  //电压量程下限
    uint8_t voltage_unit[8];              //测量结果单位
}AI_Channel_Config_t;

typedef struct {
    bool    power_12_enable;                        //pin1 12v电源是否开启 0:否 1:是
    uint16_t power_12_current;                       //pin1 12v电源输出的电流大小
    uint16_t power_12_time;                          //pin1 12v电源采集时输出的时间

    bool    power_33_enable;                        //pin2 3.3v电源是否开启 0:否 1:是
    uint16_t power_33_current;                       //pin2 3.3v电源输出的电流大小
    uint8_t power_33_mode;                          //pin2 3.3v电源输出的模式 0:持续供电 1:可配置供电
    uint16_t power_33_time;                          //pin2 3.3v电源 可配置供电模式下 采集时输出的时间
}PIN_Config_t;

typedef struct {
    PIN_Config_t         ai_pin_config;    // 接口1配置
    AI_Channel_Config_t  ai_channel[UNP_MAX_AI_NUM];
}General_AI_Config_t;

typedef struct {
    uint8_t enable;
	uint8_t mode;        //0:输入 1:输出 2:计数
	uint8_t pull;           //0:无上下拉(悬空) 1:拉高  2:拉低
    uint8_t enable_counter;  //是否开启计数 0:否 1:是
	uint8_t save_counter;    //是否保存计数器(重启设备后是否清零)  0:不保存 1:保存   计数模式才有效
	uint8_t filter;          //是否滤波 0:不滤波 1:滤波                            计数模式才有效
    uint8_t filter_unit;     //滤波时间单位 0:us 1:ms                             计数模式才有效
    uint16_t filter_time;    //滤波时间                                           计数模式才有效
}GPIO_Base_Config_t;

typedef struct {
    bool enable;                     //是否开启
    uint8_t mode;                    //串口模式 0:RS485 1:RS232  (serial_mode_e)
    PIN_Config_t pin_config;         // 接口2配置 pin1 pin2 配置 
} Console_Base_Config_t;


typedef struct {
	uint8_t enable;
	uint8_t domain_or_ip[UNP_DOMAIN_IP_MAX_LEN]; //服务器名称
    uint8_t retry_times;                         //重试次数
    uint8_t retry_interval;                      //重试间隔
    uint16_t keep_interval;                      //心跳间隔 单位：秒
	uint16_t server_port;                        //服务器端口
}TCP_UDP_Server_t;

typedef struct {
    uint32_t baudrate;                     //波特率
    uint8_t data_bits;                     //数据位
    uint8_t stop_bits;                     //停止位
    uint8_t parity;                        //奇偶校验位 0:无校验 1:奇校验 2:偶校验  (parity_mode_e)

    uint16_t cmd_internal;                 //指令执行间隔
    uint16_t cmd_timeout;                  //指令执行超时时间
    uint8_t probe_count;                   //指令执行重试次数
    bool enable_passthrough;               //是否开启透传

    uint8_t  protocol;                     //协议类型   (Server_Type_e)
    uint16_t bytes_per_frame;              //每帧字节数
	uint16_t interval_per_frame;           //每帧间隔时长
    TCP_UDP_Server_t server_1;             //透传服务器配置
    TCP_UDP_Server_t server_2;             //透传服务器配置
} RS485_Config_t;

typedef struct {
    uint32_t baudrate;                     //波特率
    uint8_t data_bits;                     //数据位
    uint8_t stop_bits;                     //停止位
    uint8_t parity;                        //奇偶校验位 0:无校验 1:奇校验 2:偶校验  (parity_mode_e)

    uint8_t  protocol;                     //协议类型  (Server_Type_e)
    uint16_t bytes_per_frame;              //每帧字节数
	uint16_t interval_per_frame;           //每帧间隔时长
    TCP_UDP_Server_t server_1;             //透传服务器配置
    TCP_UDP_Server_t server_2;             //透传服务器配置
} RS232_Config_t;

typedef struct {
    uint8_t enable;                 //是否开启
    uint8_t slaveid;                //通道号
    uint8_t quantity;               //寄存器数量
    uint8_t type;//modbus_reg_t     //寄存器类型  (参考: Modbus_Reg_e)
    uint8_t sign;                   //有符号类型 0:无符号 1:有符号
    uint8_t decimal;
    uint16_t address;               //寄存器地址
    uint8_t name[UNP_MODBUS_NAME_MAX_LEN];
}Modbus_Channel_Config_t;

typedef struct {
    Console_Base_Config_t base_config;
    RS485_Config_t rs485_config;
    RS232_Config_t rs232_config;
    Modbus_Channel_Config_t modbus_channels[UNP_MODBUS_MAX_CHAN]; //modbus通道配置
}General_Console_Config_t;

typedef struct {
    General_Base_Config_t base_config;        //该变量放在最前面，在pApplication指针会直接执行存储的起始地址
    General_AI_Config_t ai_config;
    GPIO_Base_Config_t gpio_config[UNXX_MAX_GPIO_NUM];
    General_Console_Config_t console_config;
} UC50X_NB_User_Config_t;


#define UNP_CLIENT_ID_MAX_LEN   64
#define UNP_USERNAME_MAX_LEN    128
#define UNP_PASSWORD_MAX_LEN    128
#define UNP_MQTT_TOPIC_MAX_LEN  128
#define UNP_CELLULAR_MAX_APN_LEN         31
#define UNP_CELLULAR_MAX_USERNAME_LEN    63
#define UNP_CELLULAR_MAX_PASSWORD_LEN    63
#define UNP_CELLULAR_MAX_PIN_LEN         8
#define UNP_CELLULAR_IMEI_LEN   15
#define UNP_CELLULAR_IMSI_LEN   15
#define UNP_CELLULAR_ICCID_LEN  20

typedef struct {
    uint8_t  domain_or_ip[UNP_DOMAIN_IP_MAX_LEN];  //服务器名称
    uint16_t server_port;                          //服务器端口
    uint8_t  client_id[UNP_CLIENT_ID_MAX_LEN];     //客户端ID   (默认使用SN)
    uint8_t  enable_user_auth;                     //是否开启用户名密码认证 0:不开启 1:开启
    uint8_t  username[UNP_USERNAME_MAX_LEN];       //用户名
    uint8_t  password[UNP_PASSWORD_MAX_LEN];       //密码
    uint16_t keep_interval;                        //心跳间隔 单位：秒

    uint8_t  enable_tls;                           //是否开启TLS  0:不开启 1:开启
    uint8_t  tls_version[8];                       //TLS版本
    uint8_t  tls_ca_cert;                          //是否有CA证书
    uint16_t  tls_ca_cert_len;                     //CA证书长度
    uint8_t  tls_client_cert;                      //是否有客户端证书
    uint16_t  tls_client_cert_len;                 //客户端证书长度
    uint8_t  tls_client_key;                       //是否有客户端私钥
    uint16_t  tls_client_key_len;                  //客户端私钥长度

    uint8_t  uplink_topic[UNP_MQTT_TOPIC_MAX_LEN]; //上行主题
    uint8_t  uplink_qos;                           //上行QOS
    uint8_t  downlink_topic[UNP_MQTT_TOPIC_MAX_LEN]; //下行主题
    uint8_t  downlink_qos;                         //下行QOS
    
    uint8_t  serial_up_passthrough_topic[UNP_MQTT_TOPIC_MAX_LEN]; //串口透传主题
    uint8_t  serial_up_passthrough_qos;                   //透传QOS
    uint8_t  serial_down_passthrough_topic[UNP_MQTT_TOPIC_MAX_LEN]; //串口透传主题
    uint8_t  serial_down_passthrough_qos;                 //透传QOS

    uint8_t  sdi_up_passthrough_topic[UNP_MQTT_TOPIC_MAX_LEN]; //sdi透传主题
    uint8_t  sdi_up_passthrough_qos;                   //透传QOS
    uint8_t  sdi_down_passthrough_topic[UNP_MQTT_TOPIC_MAX_LEN]; //sdi透传主题
    uint8_t  sdi_down_passthrough_qos;                 //透传QOS
} MQTT_Server_Config_t;


typedef struct {
    uint8_t tls_ca_cert;                          //是否有CA证书
    uint8_t tls_client_cert;                      //是否有客户端证书
    uint8_t tls_client_key;                       //是否有客户端私钥

    uint8_t aws_server[UNP_DOMAIN_IP_MAX_LEN];             //AWS 服务器地址
    uint16_t keep_interval;                       //心跳间隔 单位：秒
    uint16_t aws_port;
} AWS_Config_t;

typedef struct {
    uint8_t apn[UNP_CELLULAR_MAX_APN_LEN + 1];
    uint8_t username[UNP_CELLULAR_MAX_USERNAME_LEN + 1];
    uint8_t password[UNP_CELLULAR_MAX_PASSWORD_LEN + 1];
    uint8_t pin[UNP_CELLULAR_MAX_PIN_LEN + 1];
    uint8_t auth_type;          //0:自动 1:PAP 2:CHAP  (cellular_auth_type_e)
    uint8_t network_type;       //0:自动 1:CAT-M1 2:NB-IoT  (cellular_network_type_e)
} Cellular_Config_t;

typedef struct {
    char IMEI[UNP_CELLULAR_IMEI_LEN + 1];   //IMEI长度固定15
    char IMSI[UNP_CELLULAR_IMSI_LEN + 1];   //IMSI长度固定15
    char ICCID[UNP_CELLULAR_ICCID_LEN + 1]; //ICCID长度固定20
    uint8_t registered;                        //是否成功注册到网络过 0:未注册 1:已注册
    char last_pin[10];                      //上次使用的PIN码
    uint8_t last_pin_error;                 //上次使用的PIN码错误次数
    uint8_t support_edrx;                   //是否支持eDRX 0:不支持 1:支持
    uint16_t edrx_cycle;                    //睡眠周期(包含PTW)
    uint16_t edrx_window;                   //睡眠窗口PTW(能够寻呼的时间)
    uint8_t support_delay_workmode;         //是否提示切换模式 0:提示 1:不提示
}Cellular_Status_t;

typedef struct {
    uint8_t              server_type;           //(Server_Type_e)1:UDP 2:TCP 3:AWS 4:MQTT 5:IoT Cloud
    MQTT_Server_Config_t mqtt_config;
    AWS_Config_t         aws_config;
    TCP_UDP_Server_t     tcp_udp_server_1;
    TCP_UDP_Server_t     tcp_udp_server_2;
    Cellular_Config_t    cellular_config;
    Cellular_Status_t    cellular_status;            //SIM卡的IMEI等信息需要写入flash
} UC50X_NB_Transmit_Config_t;



#define UNP_SDI_COMMAND_SIZE    64
#define UNP_SDI_MAX_CHAN        16
typedef struct {
    bool  enable;                         //是否开启
    bool  power_enable;                   //是否开启输出电源
    uint16_t power_time;                  //电源持续输出时间
    uint16_t power_current;               //电源输出的电流值

    uint32_t  baudrate;                   //波特率
    uint8_t data_bits;                    //数据位
    uint8_t stop_bits;                    //停止位
    uint8_t parity;                       //奇偶校验位 0:无校验 1:奇校验 2:偶校验
    uint8_t max_retry;                    //最大重试次数
    bool    enable_passthrough;           //是否开启透传

    uint8_t  protocol;                    //协议类型  (Server_Type_e)

    TCP_UDP_Server_t server_1;           //透传服务器配置
    TCP_UDP_Server_t server_2;           //透传服务器配置
} SDI12_Config_t;

typedef struct {
    uint8_t enable;                     //对应使能口
    uint8_t name[UNP_SDI_NAME_MAX_LEN]; //名称
    uint8_t address;                    //存放获取的地址
    uint8_t custom_command[UNP_SDI_COMMAND_SIZE];	//发送命令集
    uint8_t reserve[6];                 //预留，若需要升级可以不用改存储
} Sdi_Channel_t;

typedef struct {
    SDI12_Config_t sdi12_config;
    Sdi_Channel_t sdi_channels[UNP_SDI_MAX_CHAN]; //SDI通道配置
} General_SDI_Config_t;

typedef struct uc50x_nb_threshold_condition_s {
    uint8_t mode;               // (alarm_mode_t)
    float min_value;			// 最小值 、 变化值
    float max_value;			// 最大值
} nb_alarm_rules_rule;

typedef struct nb_cut_rule_config {
	uint8_t enable;
	uint8_t rule_id;
	nb_alarm_rules_rule thr_condition;
} nb_cut_rule_config_t;

typedef struct nb_alarm_rule_e {
	nb_cut_rule_config_t rule[RULE_CHANNELS];
} nb_rule_config_t;

/*************************************** UC50X-NB END*****************************************/


/*************************************** UC51X-CAT1 BEGIN*****************************************/
#define TRANSPORT_DOMAIN_IP_MAX_LEN  128
#define TRANSPORT_TCP_SERVER_MAX_NUM  2
#define TRANSPORT_UDP_SERVER_MAX_NUM  2

#define MQTT_CLIENT_ID_MAX_LEN   64
#define MQTT_USERNAME_MAX_LEN    128
#define MQTT_PASSWORD_MAX_LEN    128
#define MQTT_SSL_FILE_NAME_LEN   32
#define MQTT_TOPIC_MAX_LEN       128     //支持最大主题名称长度
#define MQTT_TPOIC_MAX_NUM       3       //支持最大订阅主题数

#define DTLS_PSK_ID_MAX_LEN      32
#define DTLS_PSK_KEY_MAX_LEN     32

#define CELLULAR_MAX_APN_LEN         31
#define CELLULAR_MAX_USERNAME_LEN    63
#define CELLULAR_MAX_PASSWORD_LEN    63
#define CELLULAR_MAX_PIN_LEN         8

#define CELLULAR_IMEI_LEN       15
#define CELLULAR_IMSI_LEN       15
#define CELLULAR_ICCID_LEN      20
#define CELLULAR_VERSION_LEN    32
#define CELLULAR_MODULENAME_LEN 16

// sizeof=172
typedef struct {
    uint8_t apn[CELLULAR_MAX_APN_LEN + 1];
    uint8_t username[CELLULAR_MAX_USERNAME_LEN + 1];
    uint8_t password[CELLULAR_MAX_PASSWORD_LEN + 1];
    uint8_t pin[CELLULAR_MAX_PIN_LEN + 1];
    uint8_t auth_type;          //0:不认证 1:PAP 2:CHAP  (cellular_auth_type_e)
    uint8_t context_type;       //1:IPV4 2:IPV6 3:IPV4V6 (cellular_context_type_e)
    uint8_t network_type;       //0:自动 1:CAT-M1 2:NB-IoT  (预留给多网络模式的模块)
} cellular_config_t;

// sizeof=64
typedef struct {
    char IMEI[CELLULAR_IMEI_LEN + 1];         //IMEI长度固定15
    char IMSI[CELLULAR_IMSI_LEN + 1];         //IMSI长度固定15
    char ICCID[CELLULAR_ICCID_LEN + 1];       //ICCID长度固定20
    char last_pin[CELLULAR_MAX_PIN_LEN + 1];  //上次使用的PIN码
    char version[CELLULAR_VERSION_LEN];       //NB模组版本
    char modulename[CELLULAR_MODULENAME_LEN]; //模组名称
    uint8_t module_type;                      //模块类型 0:unknown 1:EC800E 2:EG800G 3:BG95-M2 4:BG95-M6
    uint8_t last_pin_error;                   //上次使用的PIN码错误次数
    uint8_t registered;                       //是否曾经成功注册到网络过 0:未注册成功 1:已注册成功
    uint8_t CSQ;                              //信号强度
} cellular_status_t;

// sizeof=725
typedef struct {
    char     domain_or_ip[TRANSPORT_DOMAIN_IP_MAX_LEN];  //服务器地址
    uint16_t server_port;                          //服务器端口
    uint16_t keep_alive_interval;                  //心跳间隔 单位：秒
    char     client_id[MQTT_CLIENT_ID_MAX_LEN];    //客户端ID   (默认使用SN)
    uint8_t  enable_user_auth;                     //是否开启用户名密码认证 0:不开启 1:开启
    uint8_t  username[MQTT_USERNAME_MAX_LEN];      //用户名
    uint8_t  password[MQTT_PASSWORD_MAX_LEN];      //密码

    uint8_t  enable_tls;                           //是否开启TLS  0:不开启 1:开启
    uint8_t  tls_ca_cert;                          //是否有CA证书
    uint32_t tls_ca_cert_data;                    //CA证书数据，可以直接只想存储区域
    uint16_t tls_ca_cert_len;                      //CA证书长度
    uint8_t  tls_client_cert;                      //是否有客户端证书
    uint32_t tls_client_cert_data;                //客户端证书数据，可以直接只想存储区域
    uint16_t tls_client_cert_len;                  //客户端证书长度
    uint8_t  tls_client_key;                       //是否有客户端私钥
    uint32_t tls_client_key_data;                 //客户端私钥数据，可以直接只想存储区域
    uint16_t tls_client_key_len;                   //客户端私钥长度

    uint8_t  uplink_topic[MQTT_TOPIC_MAX_LEN];     //上行主题
    uint8_t  uplink_qos;                           //上行QOS
    uint8_t  downlink_topic[MQTT_TOPIC_MAX_LEN];   //下行主题
    uint8_t  downlink_qos;                         //下行QOS

    uint8_t  status;                               //连接状态, 0:未连接 1:已连接
} transport_mqtt_config_t;

// sizeof=137
typedef struct {
    char     domain_or_ip[TRANSPORT_DOMAIN_IP_MAX_LEN];  //服务器地址
    uint16_t server_port;                          //服务器端口
    uint8_t  retry_times;                          //重连次数
    uint16_t retry_interval;                       //重连间隔 单位：秒
    uint16_t keep_alive_interval;                  //保活间隔 单位：秒
    uint8_t  enable;                               //是否开启
    uint8_t  status;                               //连接状态, 0:未连接 1:已连接
} transport_tcp_config_t;

typedef struct {
    char     domain_or_ip[TRANSPORT_DOMAIN_IP_MAX_LEN];  //服务器地址
    uint16_t server_port;                          //服务器端口
    uint8_t  enable;                               //是否开启
    uint8_t  status;                               //连接状态, 0:未连接 1:已连接
} transport_udp_config_t;

// sizeof=136
typedef struct {
    char     domain_or_ip[TRANSPORT_DOMAIN_IP_MAX_LEN];  //服务器地址
    uint16_t server_port;                          //服务器端口
    uint16_t keep_alive_interval;                  //保活间隔 单位：秒
    uint8_t  status;                               //连接状态, 0:未连接 1:已连接
    uint8_t  tls_ca_cert;                          //是否有CA证书
    uint8_t  tls_client_cert;                      //是否有客户端证书
    uint8_t  tls_client_key;                       //是否有客户端私钥
} transport_aws_config_t;

typedef struct {
    uint8_t work_mode;                            //工作模式
    uint8_t enable_rps;                           //是否开启RPS
    cellular_config_t cellular_config;            //蜂窝配置
    cellular_status_t cellular_status;            //蜂窝状态, 用于存储IMEI, IMSI, ICCID等信息
    uint8_t transport_type;                       //传输类型
    transport_mqtt_config_t mqtt_config;          //MQTT配置
    transport_tcp_config_t tcp_config;            //TCP配置
    transport_udp_config_t udp_config;            //UDP配置
    transport_aws_config_t aws_config;            //AWS配置
} cellular_params_t;
/*************************************** UC51X-CAT1 END*****************************************/

#pragma pack()

/////////////////////////////////////////////////////////////////////////////////////////////////
/*************************************** EM410-CAT1 BEGIN***************************************/
#pragma pack(1)
typedef enum {
    AUTH_NONE = 0,
	PAP,
	CHAP,
    PAP_OR_CHAP
} cellular_auth_type_e;

typedef enum {
    CONTEXT_UNKNOWN = 0,
    CONTEXT_IPV4,
    CONTEXT_IPV6,
    CONTEXT_IPV4V6,
    CONTEXT_MAX,
} cellular_context_type_e;

typedef enum
{
    CELLULAR_PIN_INITED = 0,
    CELLULAR_PIN_READY,
    CELLULAR_PIN_NOT_READY,
    CELLULAR_PIN_NEED,
    CELLULAR_PIN_ERROR,
    CELLULAR_PIN_PUK_NEED,
    CELLULAR_PIN_NO_INSERT,
} cellular_pin_state_e;

typedef enum {
    CELLULAR_TRANSPORT_UNKNOWN = 0,
    CELLULAR_TRANSPORT_UDP,
    CELLULAR_TRANSPORT_TCP,
    CELLULAR_TRANSPORT_AWS,
    CELLULAR_TRANSPORT_MQTT,
    CELLULAR_TRANSPORT_IOT_CLOUD,
    CELLULAR_TRANSPORT_DEVELOPER_MQTT,
    CELLULAR_TRANSPORT_DEVELOPER_DTLS,
} cellular_transport_type_e;

typedef struct {
    uint8_t network_status;                   //0:未注网 1:注网成功
    uint8_t server_status;                    //0:未连接服务器 1:连接服务器成功
    uint8_t last_registered;                  //上次是否成功注册到网络 0:未注册成功 1:已注册成功
    uint8_t power_state;                      //模块开关机状态 0:关机 1:开机
    uint8_t rrc_state;                        //RRC连接状态（与基站的连接）
    uint8_t pin_state;                        //SIM卡状态
    uint8_t pdp_context;                      //PDP激活的context id
    uint8_t context_type;                     //PDP激活的context类型 1:IPV4 2:IPV6 3:IPV4V6 (cellular_context_type_e)
    bool  is_support_edrx;                    //NB模块是否支持eDRX
    uint16_t sleep_cycle;                     //睡眠周期(包含PTW)
    uint16_t sleep_window;                    //睡眠窗口PTW(能够寻呼的时间)
    uint16_t frame_count;                     //发送的帧计数
} cellular_connect_status_t;

// sizeof=198
typedef struct {
    char     domain_or_ip[TRANSPORT_DOMAIN_IP_MAX_LEN+1];  //服务器地址
    uint16_t server_port;                          //服务器端口
    bool     enable_qos;                           //是否开启上报确认  0:不开启 1:开启
    bool     support_ack;
    bool     enable_retain;
    uint8_t  resend_times;                         //开启确认后，重发次数
    uint16_t resend_interval;                      //开启确认后，重发间隔 单位：秒
    char     psk_id[DTLS_PSK_ID_MAX_LEN+1];        //PSK标识
    char     psk_key[DTLS_PSK_KEY_MAX_LEN+1];      //PSK密钥
    uint8_t  status;                               //连接状态, 0:未连接 1:已连接
} transport_dtls_config_t;

typedef struct {
    char     domain_or_ip[TRANSPORT_DOMAIN_IP_MAX_LEN+1];  //服务器地址
    uint16_t server_port;                          //服务器端口
    uint16_t keep_alive_interval;                  //保活间隔 单位：秒
    uint8_t  status;                               //连接状态, 0:未连接 1:已连接
    uint8_t  tls_ca_cert;                          //是否有CA证书
    uint8_t  tls_client_cert;                      //是否有客户端证书
    uint8_t  tls_client_key;                       //是否有客户端私钥
} transport_develop_mqtt_config_t;

typedef struct em410_cellular_params_s {
    uint8_t work_mode;                            //工作模式
    uint8_t enable_rps;                           //是否启用RPS
    uint8_t sync_execed;                          //是否已经同步过RPS配置
    cellular_config_t cellular_config;            //蜂窝配置
    cellular_status_t cellular_status;            //蜂窝状态, 用于存储IMEI, IMSI, ICCID等信息
    uint8_t transport_type;                       //传输类型 1-UDP 2-TCP 3-AWS 4-MQTT
    transport_mqtt_config_t mqtt_config;          //MQTT配置
    transport_tcp_config_t tcp_config;            //TCP配置
    transport_udp_config_t udp_config;            //UDP配置
    transport_aws_config_t aws_config;            //AWS配置
    transport_dtls_config_t dtls_config;
    transport_develop_mqtt_config_t dev_mqtt_config;
} em410_cellular_params_t;

#pragma pack()
/*************************************** EM410-CAT1 END***************************************/
///////////////////////////////////////////////////////////////////////////////////////////////

#define FLASH_APP_BAK_ADDR				(0x08000000 + 0x44000)		//begin at 272kb
#define FLASH_APP_BAK_LEN				0x36800
#define FLASH_PARAMS_BASE_ADDR      	(0x08000000 + 0x3D800)   //begin at 246kb


//#define FLASH_LOCKFLAG1_ADDR         FLASH_PARAMS_BASE_ADDR

//flash flag
#define FLASH_FLAG_ADDR							(FLASH_PARAMS_BASE_ADDR)
#define FLAG_LEN										0x400
//#define FLASH_LOCKFLAG1_ADDR         FLASH_PARAMS_BASE_ADDR//(FLASH_UPGRADE_INFO_ADDR + UPGRADE_INFO_LEN + UPGRADE_INFO_RESERVED)
//#define LOCKFLAG1_LEN                0x200

//#define FLASH_LOCKFLAG2_ADDR         (FLASH_LOCKFLAG1_ADDR + LOCKFLAG1_LEN)
//#define LOCKFLAG2_LEN                0x200
//#define FLASH_UNXX_MAGIC_ADDR        (FLASH_LOCKFLAG2_ADDR + LOCKFLAG2_LEN)

#define FLASH_UNXX_MAGIC_ADDR        (FLASH_FLAG_ADDR + FLAG_LEN)
#define UNXX_MAGIC_LEN               0x200

#define FLASH_UPGRADE_INFO_ADDR      (FLASH_UNXX_MAGIC_ADDR + UNXX_MAGIC_LEN)
#define UPGRADE_INFO_LEN             0x10
#define UPGRADE_INFO_RESERVED        (0x200 - UPGRADE_INFO_LEN)

//flash cfg   should backup start
#define FLASH_PRODUCT_INFO_ADDR      (FLASH_UPGRADE_INFO_ADDR+UPGRADE_INFO_RESERVED+UPGRADE_INFO_LEN)
#define PRODUCT_INFO_LEN             0x100

#define FLASH_PN_INFO_ADDR           (FLASH_PRODUCT_INFO_ADDR+PRODUCT_INFO_LEN)//(FLASH_PRODUCT_INFO_ADDR + PRODUCT_INFO_LEN)
#define PN_INFO_LEN                  0x80

#define FLASH_DEVICE_INFO_ADDR       (FLASH_PN_INFO_ADDR+PN_INFO_LEN)
#define DEVICE_INFO_LEN              0x100

#define FLASH_RULES_INFO_ADDR        (FLASH_DEVICE_INFO_ADDR + DEVICE_INFO_LEN)
#define RULES_INFO_LEN               0x100

#define FLASH_APPLICATION_INFO_ADDR  (FLASH_RULES_INFO_ADDR + RULES_INFO_LEN)
#define APPLICATION_INFO_LEN         0x80

#define FLASH_USR_CONFIG_ADDR        (FLASH_APPLICATION_INFO_ADDR + APPLICATION_INFO_LEN)
#define USR_CONFIG_LEN               0x400

#define FLASH_LORA_INFO_ADDR         (FLASH_USR_CONFIG_ADDR + USR_CONFIG_LEN)
#define LORA_INFO_LEN                0x800


#define FLASH_USER_PARAMS_SIZE       0x2000
#define FLASH_USER_PARAMS_ADDR       (0x08000000 + 0x3E000)
#define FLASH_USER_BAK_PARAMS_ADDR   (FLASH_USER_PARAMS_ADDR + FLASH_USER_PARAMS_SIZE)
#define FLASH_USER_READBAK_PARAMS_ADDR   (FLASH_USER_BAK_PARAMS_ADDR + FLASH_USER_PARAMS_SIZE)

extern application_ds3604_t *pApplication_ds3604;
extern application_am319_t  *pApplication_am319;
extern am319_alarm_params_t  *pAlarmParams_am319;
extern user_config_am319_t *pUserConfig_am319;
extern user_config_em400_t *pUserConfig_em400;
extern user_config_em400_nb_t *pUserConfig_em400_nb;
extern user_config_uc51x_t *pUserConfig_uc51x;
extern user_config_uc51x_rules_t *pUserConfig_uc51x_rules;
extern user_config_t_am  *pUserConfig_am;
extern user_config_t_am  *pUserConfig_am103;
extern user_config_t_ws302  *pUserConfig_ws302;
extern user_config_t_fp001  *pUserConfig_fp001;
extern user_config_t_n1  *pUserConfig_n1;
extern user_config_t_n1_new_t *pUserConfig_n1_new;
extern user_config_t_em500  *pUserConfig_em500;
extern user_config_em310_tilt_t *pUserConfig_em310_tilt;
extern user_config_em320_tilt_t *pUserConfig_em320_tilt;
extern user_config_em320_th_t *pUserConfig_em320_th;
extern user_config_em300_di_t *pUserConfig_em300_di;
extern user_config_em300_cl_t *pUserConfig_em300_cl;
extern user_config_ts101_t *pUserConfig_ts101;
extern user_config_ts201_t *pUserConfig_ts201;
extern user_config_ts30x_t *pUserConfig_ts30x;
extern user_config_vs350_t *pUserConfig_vs350;
extern user_config_vs351_t *pUserConfig_vs351;
extern user_config_vs321_t *pUserConfig_vs321;
extern flash_flag_t		 *pFlash_flag;
extern user_config_t     *pUserConfig;
extern product_info_t    *pProductInfo;
extern pn_info_t         *pPNInfo;
extern pn_info_v1_t      *pPNInfo_v1;
extern unxx_magic_t      *pUNxxMagic;
extern device_param_t    *pDeviceParam;
extern alarm_params_t    *pAlarmParams;
extern alarm_params_em310_tilt_t *pAlarmParams_em310_tilt;
extern alarm_params_em320_tilt_t *pAlarmParams_em320_tilt;
extern alarm_params_ws201_t *pAlarmParams_ws201;
extern alarm_params_em300_di_t *pAlarmParams_em300_di;
extern alarm_params_em300_cl_t *pAlarmParams_em300_cl;
extern alarm_params_t_wts *pAlarmParams_wts;
extern alarm_params_vs350_tilt_t *pAlarmParams_vs350_tilt;
extern alarm_params_vs351_tilt_t *pAlarmParams_vs351_tilt;
extern alarm_params_vs360_tilt_t *pAlarmParams_vs360_tilt;
extern alarm_params_vs321_t *pAlarmParams_vs321;
extern application_set_t *pApplication;
extern application_set_t_em500 *pApplication_em500;
extern application_set_t_am103 *pApplication_am103;
extern application_set_t_ws302 *pApplication_ws302;
extern application_set_t_fp001 *pApplication_fp001;
extern application_set_t_n1 *pApplication_n1;
extern application_uc51x_t *pApplication_uc51x;
extern application_ws51x_t *pApplication_ws51x;
extern application_ws52x_t *pApplication_ws52x;
extern application_ws50x_t *pApplication_ws50x;
extern application_ws30x_t *pApplication_ws30x;
extern application_ws10x_t *pApplication_ws10x;
extern application_ws20x_t *pApplication_ws20x;
extern application_ws203_t *pApplication_ws203;
extern application_vs34x_t *pApplication_vs34x;
extern application_wt101_t *pApplication_wt101;
extern application_ws201_t *pApplication_ws201;
extern application_ws156_t *pApplication_ws156;
extern application_em310_t  *pApplication_em310;
extern application_em310_tilt_t *pApplication_em310_tilt;
extern application_em320_tilt_t *pApplication_em320_tilt;
extern application_em320_th_t *pApplication_em320_th;
extern application_em300_di_t *pApplication_em300_di;
extern application_em300_cl_t *pApplication_em300_cl;
extern application_em300_t *pApplication_em300;
extern application_ws55x_t *pApplication_ws55x;
extern application_ts101_t *pApplication_ts101;
extern application_ts201_t *pApplication_ts201;
extern application_ts30x_t *pApplication_ts30x;
extern application_wts_t *pApplication_wts;
extern application_vs350_t  *pApplication_vs350;
extern application_vs351_t  *pApplication_vs351;
extern application_vs360_t  *pApplication_vs360;
extern application_vs370_t  *pApplication_vs370;
extern application_vs321_t *pApplication_vs321;
extern LoRaWANParams_t 	 *pLoRaWANParams;
extern LoRaWANParams_t 	 default_LoRaWANParams;
extern NBParams_t		 *pNBParams;
extern uc11t1_status_t   g_uc11t1_status;
extern uc11t1_temphumi_t g_uc11t1_data;
extern application_gs301_t  *pApplication_gs301;
extern user_config_gs301_t *pUserConfig_gs301;
extern gs301_alarm_params_t  *pAlarmParams_gs301;
extern application_vs330_t  *pApplication_vs330;
extern user_config_vs330_t  *pUserConfig_vs330; 
extern application_ws303_t  *pApplication_ws303;
extern user_config_ws201_t  *pUserConfig_ws201;
extern user_config_ws201v2_t  *pUserConfig_ws201v2;
extern user_config_ws203_t  *pUserConfig_ws203;
extern user_config_ts30x_t *pUserConfig_ts30x;
extern em400_alarm_params_t  *pAlarmParams_em400;
extern em400_application_t    *pApplication_em400; 
extern em400_nb_alarm_params_t  *pAlarmParams_em400_nb;
extern em400_nb_application_t    *pApplication_em400_nb;
extern alarm_params_ts30x_t *pAlarmParams_ts30x;
extern transmit_config_t *pTransmit;
extern cellular_info_t *pCellular;
extern at101_application_t *pApplication_at101;
extern rule_config_t   *pRuleConfig;
extern user_config_t_v3   *pUserConfig_v3;
extern user_config_t_sdi  *pUserConfig_sdi;
extern cut_sdi_config_t  *pCutSdiConfig;
extern wt101_user_config_t *pUserConfig_wt101;
extern wt201_application_t *pApplication_wt201;
extern wt201_application_v2_t *pApplication_wt201_v2;
extern wt201_user_config_t *pUserConfig_wt201;
extern wt201_alarm_params_t *pAlarmParams_wt201;
extern UC50X_NB_User_Config_t *pUser_config_50x_nb;
extern UC50X_NB_Transmit_Config_t *pTransmit_50x_nb;
extern nb_rule_config_t *pCut_rule_50x_nb;
extern SDI12_Config_t *pCut_sdi_config_50x_nb;
extern General_SDI_Config_t *pSdi_config_50x_nb;
extern user_config_em410_t *pUserConfig_em410;
extern application_em410_t *pApplication_em410;
extern alarm_params_em410_t *pAlarmParams_em410;
extern cellular_params_t *pCellularParams_51x_cat1;
extern em410_cellular_params_t *pCellularParams_em410_cat1;
extern application_uc52x_t *pApplication_uc52x;
extern user_config_uc52x_rules_t *pUserConfig_uc52x_rules;
extern cellular_params_t *pCellularParams_52x_cat1;
extern application_uc52x_lora_t *pApplication_uc52x_lora;
extern user_config_uc52x_lora_rules_t *pUserConfig_uc52x_lora_rules;

extern void write_data_to_flash(uint32_t *data, uint16_t len_bytes, uint32_t* addr);
extern void read_data_from_flash(uint32_t *data, uint16_t len_bytes, uint32_t* addr, uint8_t fromisr);
extern void copy_readbak(void);
extern void unxx_save_default_config(void);
void flash_product_addr_init(uint8_t *addr);
extern void flash_addr_init(uint8_t * addr);
extern void flash_addr_init_11n1(uint8_t * addr);
extern void flash_addr_init_uc50x_nb(uint8_t * addr);
extern void flash_addr_init_wts(uint8_t * addr);
extern void flash_addr_init_uc50x_v3_sdi(uint8_t * addr);
extern void flash_addr_init_uc50x_nb_sdi(uint8_t * addr);
void flash_addr_init_ws558(uint8_t *addr);
void flash_addr_init_ws50x(uint8_t * addr, uint8_t version);
void flash_addr_init_gs301(uint8_t * addr);
void flash_addr_init_uc51x(uint8_t * addr);
void flash_addr_init_wt101(uint8_t * addr);
void flash_addr_init_wt201(uint8_t * addr);
void flash_addr_init_wt201_v2(uint8_t * addr);
void flash_addr_init_em410(uint8_t * addr);
void flash_addr_init_uc51x_cat1(uint8_t * addr);
void flash_addr_init_uc52x_cat1(uint8_t * addr);
void flash_addr_init_uc52x_lora(uint8_t * addr);
void flash_addr_init_vs321(uint8_t * addr);

#endif

