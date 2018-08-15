module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//联系我们首页
	index(){
		if(!post(data => {
				this._getContactMe();
		} ) )end("Param Error!");
	}
	//去吐槽
	usercomment(){
		if(!post(data => {
			if( !data.openid || !data.comment ) return api_error("5001");
			else this._userComment(data);
		} ) )end("Param Error!");
	}
	//联系我们
	_getContactMe(data){
		this.redis.get("contact", contact => {
			return api_success(contact);
		} );
	}
	//去吐槽
	_userComment(data){
		this.redis.hget("user", data.openid, resuser => {
			if( !resuser ) return api_error("4102");
			else{
				let usercomment = {
					user_id : resuser.id,
					nick : resuser.nick,
					comment : data.comment,
					comtime : time()
				};
				rlog("addUserComment", usercomment);
				return api_success("吐槽成功");
			}
		} );
	}
}();