import BaseClass from './Libs/BaseClass.test.js';
import DeviceList from './Data/DeviceList.test.js';
import TuyaDevice from './TuyaDevice.test.js';
import { Hex } from './Crypto/Hex.test.js';

export default class TuyaVirtualDevice extends BaseClass
{
    constructor(deviceData, customLedCount = null)
    {
        super();
        // Initialize tuya device from saved data
        this.tuyaDevice = new TuyaDevice(deviceData, null);
        this.frameDelay = 50;
        this.lastRender = 0;
        
        // Allow custom LED count to override device default
        this.customLedCount = customLedCount;

        this.setupDevice(this.tuyaDevice);
    }
    
    getLedNames()
    {
        let ledNames = [];
        for (let i = 1; i <= this.ledCount; i++)
        {
            ledNames.push(`Led ${i}`);
        }
        return ledNames;
    }

    getLedPositions()
    {
        let ledPositions = [];
        
        // Crear posiciones dinámicas - puede ser lineal o en grid
        const ledsPerRow = Math.min(this.ledCount, 50); // Máximo 50 LEDs por fila
        
        for (let i = 0; i < this.ledCount; i++)
        {
            const row = Math.floor(i / ledsPerRow);
            const col = i % ledsPerRow;
            ledPositions.push([col, row]);
        }
        return ledPositions;
    }

    setupDevice(tuyaDevice)
    {
        // Usar custom LED count si está disponible, sino usar el del device list
        if (this.customLedCount && this.customLedCount > 0) {
            this.ledCount = this.customLedCount;
            // Crear array de LEDs dinámico
            this.tuyaLeds = Array.from({length: this.ledCount}, (_, i) => ({id: i + 1}));
        } else {
            // Fallback al comportamiento original
            this.tuyaLeds = DeviceList[tuyaDevice.deviceType]?.leds || [{id: 1}];
            this.ledCount = this.tuyaLeds.length;
        }

        this.ledNames = this.getLedNames();
        this.ledPositions = this.getLedPositions();

        device.setName(tuyaDevice.getName());

        // Calcular tamaño dinámico del dispositivo
        const ledsPerRow = Math.min(this.ledCount, 50);
        const rows = Math.ceil(this.ledCount / ledsPerRow);
        device.setSize([ledsPerRow, rows]);
        
        device.setControllableLeds(this.ledNames, this.ledPositions);
        
        device.log(`Device setup complete with ${this.ledCount} LEDs`);
    }

    render(lightingMode, forcedColor, now)
    {
        if (now - this.lastRender > this.frameDelay)
        {
            this.lastRender = now;
            let RGBData = [];
            switch(lightingMode)
            {
                case "Canvas":
                    RGBData = this.getDeviceRGB();
                    break;
                case "Forced":
                    for (let i = 0; i < this.ledCount; i++)
                    {
                        RGBData.push(this.hexToRGB(forcedColor));
                    }
                    break;
            }

            let colorString = this.generateColorString(RGBData);
            this.tuyaDevice.sendColors(colorString);
        }
    }

    getDeviceRGB()
    {
        const RGBData = [];
    
        for(let i = 0 ; i < this.ledPositions.length; i++){
            const ledPosition = this.ledPositions[i];
            const color = device.color(ledPosition[0], ledPosition[1]);
            RGBData.push(color);
        }
    
        return RGBData;
    }

    generateColorString(colors)
    {
        let spliceLength = this.tuyaLeds.length;
        if (colors.length == 1) spliceLength = 1;

        if (spliceLength === 1)
        {
            const [h1,s1,v1] = this.rgbToHsv(colors[0]);
            let color = this.getW32FromHex(h1.toString(16), 2).toString(Hex) +
                        this.getW32FromHex(parseInt(s1 / 10).toString(16), 1).toString(Hex) +
                        this.getW32FromHex(parseInt(v1 / 10).toString(16), 1).toString(Hex);

            return color + "00000100";
        } else
        {
            let colorArray = [];

            for (let color of colors)
            {
                const [h,s,v] = this.rgbToHsv(color);
                colorArray.push(
                    this.getW32FromHex(h.toString(16), 2).toString(Hex) +
                    this.getW32FromHex(s.toString(16), 2).toString(Hex) +
                    this.getW32FromHex(v.toString(16), 2).toString(Hex)
                );
            }

            // ELIMINACIÓN DE LA LIMITACIÓN DE 16 LEDs
            let colorString = '';
            
            // Calcular dinámicamente el número de grupos necesarios
            const ledsPerGroup = 4; // Cada grupo maneja 4 LEDs
            const numGroups = Math.ceil(this.tuyaLeds.length / ledsPerGroup);
            
            for(let i = 1; i <= this.tuyaLeds.length; i++)
            {
                // Calcular el grupo al que pertenece este LED
                const groupNum = Math.ceil(i / ledsPerGroup);
                
                // Convertir número de grupo a hex con padding
                const groupHex = this.zeroPad(groupNum.toString(16), 2);
                colorString += groupHex;
            }
    
            let spliceNumHex = this.getW32FromHex(spliceLength.toString(16), 2).toString(Hex);
            let colorValue = '0004' + colorArray.join('') + spliceNumHex + colorString;
    
            return colorValue;
        }
    }
    
    // Función helper para padding con ceros
    zeroPad(str, len) {
        return str.padStart(len, '0');
    }
    
    // Método para cambiar dinámicamente el número de LEDs
    setLedCount(newCount) {
        if (newCount > 0 && newCount <= 2000) { // Límite máximo configurable
            this.customLedCount = newCount;
            this.setupDevice(this.tuyaDevice);
            device.log(`LED count changed to ${newCount}`);
            return true;
        }
        device.log(`Invalid LED count: ${newCount}. Must be between 1 and 2000.`);
        return false;
    }
    
    // Método para obtener el número actual de LEDs
    getLedCount() {
        return this.ledCount;
    }
}
