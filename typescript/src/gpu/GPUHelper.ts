
export class GPUHelper {
    static readonly supported = globalThis.navigator?.gpu !== undefined;
    private static device?: GPUDevice;
    static async getDevice() {
        if ( !GPUHelper.supported ) {
            throw new Error( "GPUDevice not supported" );
        }
        if ( GPUHelper.device ) {
            return GPUHelper.device;
        }

        const adapter = ( await globalThis.navigator!.gpu!.requestAdapter() )!;
        const device = ( await adapter.requestDevice() )!;
        GPUHelper.device = device as any;
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
