#ifndef __NFC_APP_H__
#define __NFC_APP_H__

#include "cJSON.h"
#include "unp.h"
#include "unxx_params.h"
#include "nfc.h"
extern status_msg_t *status;
extern void get_value_string2(uint8_t * string,int16_t value,uint16_t accuracy);
extern void get_value_string(uint8_t * string,int32_t value,int32_t accuracy);
extern int atoi_len(char * data,uint16_t len);
extern int version_to_number(char * str);
extern void set_threshold_value(cJSON *root,char *type,sensor_cfg_t *sensor_cfg,uint16_t accuracy);
extern void set_abnormal_check_value(cJSON *root);
extern void set_calibration_threshold_value(cJSON *root,char *type ,sensor_cfg_t *sensor_cfg ,uint16_t accuracy,uint8_t threshold);
extern void add_josn_data_string(cJSON *status_page,cJSON *root,char *name,char *data,char *unit,char *type);
extern void add_josn_data_number(cJSON *status_page,cJSON *root,char *name,uint32_t data,char *unit,char *type);
extern void add_josn_data_bool(cJSON *status_page, cJSON *root, char *name, uint32_t data, char *unit, char *type);
extern void add_json_calibration_threshold_value(cJSON *root,char *type,sensor_cfg_t *sensor_cfg,char * unit,char * data,char *calibration_value,uint8_t threshold,uint16_t accuracy);
extern uint8_t str2hex_byte(char str);
extern void str2hex(char *str,char* hex);
extern void set_alarm_report(cJSON *root, char *type);
extern void add_alarm_report(cJSON *root, char *type);

char *get_flash_product_info(char *data,int len);
char *get_flash_base_info(char *data,int len);
char *get_status_info(char *data);
char *set_flash_base_info(char *data,char *json);
uint16_t set_flash_base_info_to_unp_sct(char *data, char *json, char *unphex);
char *get_sdi_base_info(char *data, int len);
char *set_sdi_base_info(char *data, char *json);
char *get_histroy_data_json(char *data, int len, char *model, char*firmware,  char* hardware);
char *set_ds3604_template(char *data, char *json);
char *get_ds3604_template(char *buffer, int len);
uint16_t get_ds3604_picture(char *data_in, char *data_out);
uint16_t set_ds3604_picture(char *data_in, char *data_out);
char *get_d2d_pairinfo(char *data,int len);

#endif
