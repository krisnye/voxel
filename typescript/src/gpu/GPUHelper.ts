

export class GPUHelper {
    static readonly supported = globalThis.navigator?.gpu !== undefined;
    private static device?: GPUDevice;

    public static async getDevice(): Promise<GPUDevice | null> {
        if ( globalThis.navigator?.gpu === undefined ) {
            return null;
        }
        if ( GPUHelper.device ) {
            return GPUHelper.device;
        }

        const adapter = await globalThis.navigator!.gpu!.requestAdapter();
        if ( !adapter ) {
            return null;
        }
        const device = await adapter.requestDevice() as any as GPUDevice;
        GPUHelper.device = device;
        return device;
    }

    static borrowReadBuffer( device: GPUDevice, minSize: number ) {
        return device.createBuffer( {
            size: minSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        } );
    }

    static returnReadBuffer( buffer: GPUBuffer ) {
        buffer.destroy();
    }

}
