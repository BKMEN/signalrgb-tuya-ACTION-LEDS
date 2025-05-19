// Archivo: TuyaRazer.js (o el archivo principal del plugin)

import TuyaVirtualDevice from './TuyaVirtualDevice.test.js';

// Variables globales
let virtualDevices = [];
let ledCountOverride = null; // Para override del número de LEDs

export function Name() { return "Tuya Smart Devices (Unlimited)"; }
export function VendorId() { return 0x1234; }
export function ProductId() { return 0x5678; }
export function Publisher() { return "BKMEN - Unlimited LEDs Mod"; }
export function Documentation(){ return "troubleshooting/tuya"; }
export function Size() { return [1, 1]; }
export function DefaultPosition(){return [0, 0];}

export function ControllableParameters()
{
    return [
        {"property":"deviceIP", "group":"connection", "label":"Device IP", "type":"textbox", "default":"192.168.1.100"},
        {"property":"deviceId", "group":"connection", "label":"Device ID", "type":"textbox", "default":""},
        {"property":"accessId", "group":"connection", "label":"Access ID", "type":"textbox", "default":""},
        {"property":"accessKey", "group":"connection", "label":"Access Key", "type":"textbox", "default":""},
        {"property":"customLedCount", "group":"advanced", "label":"Custom LED Count", "type":"number", "min":1, "max":2000, "default":0, "help":"Set to 0 to use device default, or specify custom count"},
        {"property":"refreshRate", "group":"performance", "label":"Refresh Rate (ms)", "type":"number", "min":10, "max":1000, "default":50},
        {"property":"autoDetect", "group":"advanced", "label":"Auto-detect settings", "type":"boolean", "default":false},
        {"property":"debugMode", "group":"advanced", "label":"Debug Mode", "type":"boolean", "default":false}
    ];
}

export function Initialize()
{
    try {
        // Obtener parámetros de configuración
        const deviceIP = Get("deviceIP");
        const deviceId = Get("deviceId");
        const accessId = Get("accessId");
        const accessKey = Get("accessKey");
        const customLedCount = Get("customLedCount");
        const refreshRate = Get("refreshRate");
        const autoDetect = Get("autoDetect");
        const debugMode = Get("debugMode");

        // Validar configuración mínima
        if (!deviceId || !accessId || !accessKey) {
            device.log("Error: Missing required Tuya credentials");
            return false;
        }

        // Configurar override de LED count si se especifica
        ledCountOverride = customLedCount > 0 ? customLedCount : null;

        // Crear datos del dispositivo
        const deviceData = {
            deviceType: customLedCount > 0 ? 'custom' : 'default',
            ip: deviceIP,
            id: deviceId,
            accessId: accessId,
            accessKey: accessKey,
            refreshRate: refreshRate,
            debugMode: debugMode
        };

        // Crear dispositivo virtual con LED count personalizado
        const virtualDevice = new TuyaVirtualDevice(deviceData, ledCountOverride);
        virtualDevices.push(virtualDevice);

        device.log(`Initialized successfully with ${virtualDevice.getLedCount()} LEDs`);
        
        if (debugMode) {
            device.log(`Debug mode enabled`);
            device.log(`Refresh rate: ${refreshRate}ms`);
            device.log(`Custom LED count: ${ledCountOverride || 'Auto'}`);
        }

        return true;

    } catch (error) {
        device.log("Error during initialization: " + error.message);
        return false;
    }
}

export function Render()
{
    const now = Date.now();
    
    for (let virtualDevice of virtualDevices) {
        virtualDevice.render("Canvas", null, now);
    }
}

export function Shutdown()
{
    try {
        device.log("Shutting down Tuya devices...");
        
        // Apagar todos los LEDs
        for (let virtualDevice of virtualDevices) {
            virtualDevice.render("Forced", "000000", Date.now());
        }
        
        // Limpiar array
        virtualDevices = [];
        ledCountOverride = null;
        
        device.log("Shutdown complete");
    } catch (error) {
        device.log("Error during shutdown: " + error.message);
    }
}

// Funciones dinámicas basadas en el dispositivo activo
export function LedNames()
{
    if (virtualDevices.length > 0) {
        return virtualDevices[0].getLedNames();
    }
    return ["Led 1"]; // Fallback
}

export function LedPositions()
{
    if (virtualDevices.length > 0) {
        return virtualDevices[0].getLedPositions();
    }
    return [[0, 0]]; // Fallback
}

// Función para validar configuración
export function Validate(step)
{
    try {
        switch(step) {
            case 1:
                const deviceIP = Get("deviceIP");
                if (!isValidIP(deviceIP)) {
                    return "Invalid IP address format";
                }
                break;
            case 2:
                const deviceId = Get("deviceId");
                const accessId = Get("accessId");
                const accessKey = Get("accessKey");
                
                if (!deviceId || deviceId.length < 10) {
                    return "Device ID must be at least 10 characters";
                }
                if (!accessId || !accessKey) {
                    return "Access ID and Access Key are required";
                }
                break;
            case 3:
                const customLedCount = Get("customLedCount");
                if (customLedCount < 0 || customLedCount > 2000) {
                    return "Custom LED count must be between 0 and 2000 (0 = auto)";
                }
                break;
        }
        return ""; // No errors
    } catch (error) {
        return "Validation error: " + error.message;
    }
}

function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

// Información del plugin
export function Brand() { return "Tuya"; }
export function Model() { return "Smart LED Controller (Unlimited)"; }
export function Description() { return "Control Tuya smart LED devices with unlimited LED support. Set custom LED count or use auto-detection."; }
export function Version() { return "2.1.0"; }
export function Author() { return "BKMEN - Unlimited LEDs Modification"; }
