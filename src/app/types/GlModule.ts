import { GlCore } from './GlCore';

export class GlModule {

	// This definite assignment operator can be replaced with a private property with an accessor method
	// which tests the optional and returns a guaranteed value.
	protected core!: GlCore;

	/** --- DO NOT OVERWRITE --- */
	public get moduleId() {
		return this.constructor;
	}

	/**
	 * --- DO NOT OVERWRITE ---\
	 * This method gets called by the GlCore upon registering the module.
	 */
	public setupModule(glCore: GlCore) {
		this.core = glCore;
		this.setup();
	}

	/**
	 * This method gets called during the setupModule routine.\
	 * It may be overwritten if additional tasks should be done upon registration.
	 */
	protected setup() {}

	/**
	 * This method gets called every time a new frame gets issued by the GlCore
	 */
	public nextFrame() {}

}
