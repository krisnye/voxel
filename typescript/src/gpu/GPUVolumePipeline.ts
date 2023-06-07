import { GPUTypeId, typeDescriptors } from "../data/Primitive.js";
import { stringEntries, stringKeys } from "../utils/StringUtils.js";
import { GPUVolume } from "./GPUVolume.js";

export class VolumePipeline<
    Bindings extends Record<string, GPUTypeId>
> {

    private constructor(
        public readonly device: GPUDevice,
        public readonly layout: GPUBindGroupLayout,
        public readonly pipeline: GPUComputePipeline,
        private readonly bindings: string[],
    ) {
    }

    encodePass( volume: Pick<GPUVolume<Bindings>, "size" | "buffers">, encoder: GPUCommandEncoder ) {
        const bindGroup = this.device.createBindGroup( {
            layout: this.layout,
            entries: this.bindings.map( ( name, index ) => {
                const buffer = volume.buffers[ name ];
                if ( !buffer ) {
                    throw new Error( `Buffer not found: ${ name }` );
                }
                return {
                    binding: index,
                    resource: {
                        buffer
                    }
                }
            } ),
        } );

        // create pass encoder for each pass
        const passEncoder = encoder.beginComputePass();
        passEncoder.setPipeline( this.pipeline );
        // doesn't take any significant time.
        passEncoder.setBindGroup( 0, bindGroup );
        passEncoder.dispatchWorkgroups( ...volume.size );
        passEncoder.end();

        return encoder;
    }

    static create<
        Bindings extends Record<string, GPUTypeId>,
    >( device: GPUDevice, props: { bindings: Bindings, shader: string } )
        : VolumePipeline<Bindings> {
        const { bindings, shader } = props;

        // create GPUShaderModule
        const declarations = `${ stringEntries( bindings ).map( ( [ name, type ], index ) => `@group(0) @binding(${ index })\nvar<storage, read_write> ${ name }: array<${ typeDescriptors[ type ].gpuType }>;\n` ).join( "" ) }`;
        const code = `${ declarations }${ shader }`;
        const shaderModule = device.createShaderModule( { code } );
        // create bindGroupLayout with bindings for each data type in the volume
        const bindGroupLayout = device.createBindGroupLayout( {
            entries: stringKeys( bindings ).map( ( _name, index ) => ( {
                binding: index,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            } ) )
        } );
        // pipeline is created with the bindGroupLayout
        const computePipeline = device.createComputePipeline( {
            layout: device.createPipelineLayout( {
                bindGroupLayouts: [ bindGroupLayout ],
            } ),
            compute: {
                module: shaderModule,
                entryPoint: "main",
            },
        } );

        return new VolumePipeline( device as any, bindGroupLayout, computePipeline, Object.keys( bindings ) );
    }
}