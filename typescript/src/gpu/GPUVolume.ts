import { GPUTypeId, typeDescriptors, TypedArrayElementGPUTypeId, bitsToBytes } from "../data/Primitive.js";
import { Volume } from "../data/Volume.js";
import { Vector3, X, Y, Z } from "../math/types.js";
import { StringKeyOf, stringEntries } from "../utils/StringUtils.js";
import { GPUHelper } from "./GPUHelper.js";

export class GPUVolume<Types extends Record<string, GPUTypeId>> {

    private constructor(
        private readonly device: GPUDevice,
        public readonly size: Vector3,
        public readonly types: Types,
        public readonly buffers: Record<StringKeyOf<Types>, GPUBuffer>,
    ) {
    }

    async copyToCPU<T extends Record<string, TypedArrayElementGPUTypeId>>(
        this: GPUVolume<T>, volume = Volume.create<T>( this.size, this.types )
    ) {
        const encoder = this.device.createCommandEncoder()
        const stagingBuffers: Record<string, GPUBuffer> = {};
        //  add command to copy buffers out to staging buffers
        for ( let name in this.types ) {
            const buffer = this.buffers[ name ];
            const stagingBuffer = stagingBuffers[ name ] = GPUHelper.borrowReadBuffer( this.device, buffer.size );
            encoder.copyBufferToBuffer( buffer, 0, stagingBuffer, 0, buffer.size );
        }

        this.device.queue.submit( [ encoder.finish() ] );
        await this.device.queue.onSubmittedWorkDone();

        // read from the staging buffers into
        for ( let name in stagingBuffers ) {
            const stagingBuffer = stagingBuffers[ name ];
            const size = this.buffers[ name ].size;
            await stagingBuffer.mapAsync( GPUMapMode.READ, 0, size );
            const copyArrayBuffer = stagingBuffer.getMappedRange( 0, size );
            // copy from to volume data array. NEXT
            const volumeDataArray = volume.data[ name ];
            // copy from the mapped staging buffer range to the volume data
            volumeDataArray.set( new typeDescriptors[ volume.types[ name ] ].arrayType( copyArrayBuffer ), 0 )
            // then unmap that staging buffer to release it
            stagingBuffer.unmap();
            // finally, return the staging buffer so it can be reused later.
            GPUHelper.returnReadBuffer( stagingBuffer );
        }

        return volume;
    }

    private async mapWrite() {
        //  technically, if you are writing n buffers
        //  it would be more efficient to start writing as soon as
        //  any were available instead of waiting for all to be mapped.
        return Promise.all(
            Object.values( this.buffers ).map( buffer => buffer.mapAsync( GPUMapMode.WRITE ) )
        )
    }

    private unmap() {
        for ( let name in this.buffers ) {
            this.buffers[ name ].unmap();
        }
    }

    public async writeFromCPU<Types extends Record<string, TypedArrayElementGPUTypeId>>( this: GPUVolume<Types>, volume: Volume<Types> ) {
        await this.mapWrite();
        this.writeFromCPUInternal( volume );
        this.unmap();
    }

    private writeFromCPUInternal<Types extends Record<string, TypedArrayElementGPUTypeId>>( this: GPUVolume<Types>, volume: Volume<Types> ) {
        for ( let name in this.buffers ) {
            const TypedArrayType = typeDescriptors[ this.types[ name ] ].arrayType;
            const gpuBuffer = this.buffers[ name ];
            const arrayBuffer = gpuBuffer.getMappedRange();
            const typedArray = new TypedArrayType( arrayBuffer );
            typedArray.set( volume.data[ name ] );
        }
    }

    static createFromCPUVolume<Types extends Record<string, TypedArrayElementGPUTypeId>>(
        device: GPUDevice, volume: Volume<Types>, props: { read?: boolean } = {},
    ) {
        const gpuVolume = GPUVolume.create( device, {
            ...props,
            size: volume.size,
            types: volume.types,
            write: true,
            //  map
            mappedAtCreation: true
        } );
        gpuVolume.writeFromCPUInternal( volume );
        //  unmap
        gpuVolume.unmap();
        return gpuVolume;
    }

    static create<Types extends Record<string, GPUTypeId>>( device: GPUDevice, props: {
        size: Vector3,
        types: Types,
        read?: boolean,
        write?: boolean,
        /**
         * If true then ALL GPUBuffers will be mapped and ready for writing at creation time.
         * You will have to manually unmap them all.
         */
        mappedAtCreation?: boolean,
    } ) {
        const { size, types, read, mappedAtCreation, write = mappedAtCreation } = props;
        const length = size[ X ] * size[ Y ] * size[ Z ];
        // create buffers
        const buffers = Object.fromEntries( stringEntries( types ).map( ( [ name, type ] ) => {
            let usage = GPUBufferUsage.STORAGE;
            if ( write ) {
                // we will have to copy from staging buffer to this
                usage |= GPUBufferUsage.COPY_DST;
            }
            if ( read ) {
                // we will have to copy from this to staging buffer
                usage |= GPUBufferUsage.COPY_SRC;
            }
            return [ name, device.createBuffer( {
                mappedAtCreation,
                size: length * bitsToBytes( typeDescriptors[ type ].bits ),
                usage
            } ) ];
        } ) );
        return new GPUVolume( device, size, types, buffers as any );
    }

    toString() {
        return `GPUVolume(${ this.size }, ${ JSON.stringify( this.types ) })`;
    }

}
