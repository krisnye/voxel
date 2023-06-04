import { GPUTypeId, typeDescriptors } from "../data/Primitive.js";
import { stringEntries, stringKeys } from "../utils/StringUtils.js";
import { GPUHelper } from "./GPUHelper.js";
import { GPUVolume } from "./GPUVolume.js";

export class VolumePipeline<
    Input extends Record<string, GPUTypeId>,
    Output extends Record<string, GPUTypeId>
> {

    private constructor(
        public readonly device: GPUDevice,
        public readonly layout: GPUBindGroupLayout,
        public readonly pipeline: GPUComputePipeline,
    ) {
    }

    encodePass( volume: GPUVolume<Input & Output>, encoder = this.device.createCommandEncoder() ) {
        const bindGroup = this.device.createBindGroup( {
            layout: this.layout,
            entries: stringKeys( volume.types ).map( ( name, index ) => {
                return {
                    binding: index,
                    resource: {
                        buffer: volume.buffers[ name ]
                    }
                }
            } )
        } );

        // create pass encoder for each pass
        const passEncoder = encoder.beginComputePass();
        passEncoder.setPipeline( this.pipeline );
        passEncoder.setBindGroup( 0, bindGroup );
        passEncoder.dispatchWorkgroups( ...volume.size );
        passEncoder.end();

        return encoder;
    }


    static async create<
        Input extends Record<string, GPUTypeId>,
        Output extends Record<string, GPUTypeId>
    >( props: { input: Input, output: Output, shader: string } )
        : Promise<VolumePipeline<Input, Output>> {
        const { input, output, shader } = props;

        const device = await GPUHelper.getDevice();
        // check no input/output names are the same.
        Object.keys( output ).forEach( name => {
            if ( input.hasOwnProperty( name ) ) {
                throw new Error( `Input and output both have same named field: ${ name }` );
            }
        } )
        const bindings = { ...input, ...output }
        // create GPUShaderModule
        const declarations = `${ stringEntries( bindings ).map( ( [ name, type ], index ) => `@group(0) @binding(${ index })\nvar<storage, read_write> ${ name }: array<${ typeDescriptors[ type ].gpuType }>;\n` ) }`;
        const code = `${ declarations }${ shader }`;
        const shaderModule = device.createShaderModule( { code } );
        // create bindGroupLayout with bindings for each data type in the volume
        const bindGroupLayout = device.createBindGroupLayout( {
            entries: stringKeys( bindings ).map( ( name, index ) => ( {
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

        return new VolumePipeline( device as any, bindGroupLayout, computePipeline );
    }
}