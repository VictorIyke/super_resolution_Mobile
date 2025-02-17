export function pixelsRGBToYCbCr(pixel: number, mode: string): number {
    const red = (pixel >> 16 & 0xFF)
    const green = (pixel >> 8 & 0xFF)
    const blue = (pixel & 0xFF)

    let result = 0
    if (mode == "y") {
        result  = (0.299 * red +
                    0.587 * green +
                    0.114 * blue) / 255

    }else if (mode == "cb"){
        result = ((-0.168935) * red +
                    (-0.331665) * green +
                    0.50059 * blue) + 128
                    
    }else if (mode == "cr") {
        result = ((0.499813 * red +
            (-0.418531) * green +
            (-0.081282) * blue) + 128)

    }
    
    return result
    
}

export function pixelsYCbCrToRGB(pixel: number, cb: number, cr: number): number{
    const y = Math.min(Math.max((pixel * 255), 0), 255);

    const red = Math.min(Math.max((y + (1.4025 * (cr-0x80))), 0), 255);

    const green = Math.min(Math.max((y + ((-0.34373) * (cb-0x80)) +
                                          ((-0.7144) * (cr-0x80))), 0), 255);

    const blue = Math.min(Math.max((y + (1.77200 * (cb-0x80))), 0), 255);

    const intPixel =  ((0xFF << 24) |
                      ((0xFF & blue) << 16) |
                      ((0xFF & green) << 8) |
                      ((0xFF & red)))

    return intPixel
}
