#ifndef UXP_ADDON_H
#define UXP_ADDON_H

#include "UxpAddonShared.h"

#if defined(_WIN32)
  #define UXP_ADDON_EXPORT __declspec(dllexport)
#else
  #define UXP_ADDON_EXPORT __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

UXP_ADDON_EXPORT addon_value uxp_addon_init(addon_env env, addon_value exports);
UXP_ADDON_EXPORT addon_value napi_register_module_v1(addon_env env, addon_value exports);
UXP_ADDON_EXPORT addon_value Init(addon_env env, addon_value exports);
UXP_ADDON_EXPORT addon_value init(addon_env env, addon_value exports);
UXP_ADDON_EXPORT void uxp_addon_terminate(void);

#define UXP_ADDON_INIT(fn) \
    extern "C" UXP_ADDON_EXPORT addon_value uxp_addon_init(addon_env env, addon_value exports) { \
        return fn(env, exports); \
    } \
    extern "C" UXP_ADDON_EXPORT addon_value napi_register_module_v1(addon_env env, addon_value exports) { \
        return fn(env, exports); \
    } \
    extern "C" UXP_ADDON_EXPORT addon_value Init(addon_env env, addon_value exports) { \
        return fn(env, exports); \
    }

#define UXP_ADDON_TERMINATE(fn) \
    extern "C" UXP_ADDON_EXPORT void uxp_addon_terminate() { \
        fn(); \
    }

#ifdef __cplusplus
}
#endif

#endif // UXP_ADDON_H
