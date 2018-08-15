const PAY = LOAD.library("pay");
const AES = LOAD.library("aes");
module.exports = new class extends Controller {
	constructor() {
		super();
	}
	index() {
		if ( !post(data => {
			PAY.wx("wxapp").createOrder( {
				openid : data.openid,
				money : data.money,
				desc : data.desc
			}, (orderid,res) => {
				LOAD.redis().hset("order", orderid, {
					openid : data.openid,
					orderid : orderid,
					desc : data.desc,
					game_id : data.game_id,
					money : data.money,
					status : 0
				} );
				//存入订单数据库
				this.redis.hget("user", data.openid, resuser => {
					let userorder = {
						user_id : resuser.id,
						nick : resuser.nick,
						orderid : orderid,
						money : data.money
					};
					rlog("addUserOrder", userorder);
				} );
				api_success(res);
			} );
		} ) ) end("Param Error!");
	}
	notify() {
		if ( !postXml(xml => {
			PAY.wx("wxapp").notify(xml, orderid => {
				let redis = LOAD.redis();
				redis.hget("order", orderid, order => {
					if ( !order ) return PAY.fail("订单不存在");
					order.status = 1;
					redis.hset("order",orderid,order);
					//存储用户已经解锁列表
					redis.hget("userclearlockgamelist", order.openid, resuserclearlockgamelist => {
						resuserclearlockgamelist = resuserclearlockgamelist || [];
						resuserclearlockgamelist.unshift( {
							game_id : order.game_id,
							state : 1
						} );
						redis.hset("userclearlockgamelist", order.openid, resuserclearlockgamelist);
					} );
					//存入数据库用户已经解锁
					this.redis.hget("game", decrypt(order.game_id), resgamevideoinfo => {
						this.redis.hget("user", order.openid, resuser => {
							let userplaygamedata = {
								user_id : resuser.id,
								nick : resuser.nick,
								game_id : decrypt(order.game_id),
								locktype : 3,
								lockcon : resgamevideoinfo.lockcon,
								userlockcon ： order.money,
								clearlock_time : time()
							};
							rlog("addAndUpUserPlayGame", userplaygamedata)
						} );
					} );
					//用户完成订单
					let userorder = {
						user_id : resuser.id,
						orderid : orderid
					};
					rlog("updatUserOrder", userorder);
				} );
			} );
		} ) ) end("Param Error!");
	}
}();