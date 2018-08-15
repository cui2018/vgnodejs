module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//系统配置
	index() {
		if ( !post(data => {
			LOAD.redis().get("setting", setting => {
				setting = setting || {};
				api_success(setting);
			} );
		} ) ) end("Param Error!");
	}
}();