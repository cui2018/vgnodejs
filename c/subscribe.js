module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//查看订阅列表(一期)(三期)
	index(){
		if(!post(data => {
			if( !data.open_id ) return api_error(5001);
			else this._getAllSubscribeProject(data);
		} ) )end("Param Error!");
	}
	//订阅(一期)(二期)(三期)
	subscribeProject(){
		if(!post(data => {
			if( !data.open_id || !data.pro_id ) return api_error(5001);
			else this._subscribe(data);
		} ) )end("Param Error!");
	}
	//取消观看
	disconnect(){
		if(!post(data => {
			if( data.open_id ) this._disconnect(data);
			else return api_error("5001");
		} ) )end("Param Error!");
	}
	//取消观看
	_disconnect(data){
		//echo("取消观看"+data.open_id);
		this.redis.hget("user", data.open_id, resuser => {
			this.redis.hget("usergametime", resuser.id, resusergametime => {
				resusergametime = resusergametime || {};
				if(resusergametime.end == 0){
					let day1 = day();
					let time1 = time();
					let userontime = {
						user_id : resuser.id,
						starttime : resusergametime.starttime,
						endtime : time1,
						ontime : time1 - resusergametime.starttime
					}
					this.redis.hset("usergametime",resuser.id,{
						starttime : time1,
						end : 1
					});
					//rlog("over_tg_gameontime",userontime);
				}
				return api_success("取消观看成功");
			});
		});
	}
	//订阅/取消订阅(一期)(三期)
	_subscribeProject(data){
		this.redis.hget("subscribe_project",data.open_id,resub_project=>{
			resub_project = resub_project || [];
			if(data.state == 0){
				this.redis.get("project",resproject=>{
					let i = resproject.search( {
						id : data.pro_id
					} );
					if( i !== false ){
						let j = resub_project.search( {
							pro_id : decrypt(data.pro_id)
						} );
						if( j !== false ) return api_success( {
							state : 1,
							msg : "订阅成功"
						} );
						else {
							resub_project.unshift( {
								pro_id : decrypt(resproject[i].id)
							} );
							this.redis.hset("subscribe_project",data.open_id,resub_project);
							rlog("addUserSubscribe",  {
								open_id : data.open_id,
								pro_id : decrypt(data.pro_id)
							} );
							return api_success( {
									state : 1,
									msg : "订阅成功"
							} );
						}
					}else{
						return api_error("5006");
					}
				});
			}else if(data.state == 1){
				let i = resub_project.search( {
					pro_id : decrypt(data.pro_id)
				} );
				if( i !== false ){
					resub_project.splice(i,1);
					this.redis.hset("subscribe_project",data.open_id,resub_project);
				}
				rlog("deleteUserSubscribe", {
					open_id : data.open_id,
					pro_id : data.pro_id
				} );
				return api_success( {
					state : 0,
					msg : "取消订阅成功"
				} );
			}
			else{
				return api_error("5001");
			}
		});
	}
	//查看订阅列表(一期)(三期)
	_getAllSubscribeProject(data){
		this.redis.hget("subscribe_project",data.open_id,resub_project =>{
			resub_project = resub_project || [];
			if( resub_project.length < 1 ){
				return api_success(resub_project);
			}
			else{
				let res = [];
				this.redis.get("project", resproject => {
					resproject.recursion((i,item,next) => {
						let j = resub_project.search( {
							pro_id : decrypt(item.id)
						} );
						if( j !== false ){
							let sub_project = {
								pro_id : item.id,
								pic : item.pic,
								name : item.name,
								score : item.score,
								subuser : item.subuser
							};
							res.push(sub_project);
						}
						next();
					}, over => {
						return api_success(res);
					} );
				} );
			}
		} );
	}
	//订阅/取消订阅(二期)
	_subscribe(data){
		this.redis.hget("subscribe", data.open_id, resubscribe => {
			if(data.state == 0){
				if( !resubscribe ){
					this.redis.hset("subscribe", data.open_id, {
						state : 1,
						sub_time : time()
					} );
				}
				rlog("addUserSubscribe",  {
					open_id : data.open_id,
					pro_id : 0
				} );
				return api_success( {
					state : 1,
					msg : "订阅成功"
				} );
			}else if(data.state == 1){
				this.redis.hdel("subscribe", data.open_id);
				rlog("deleteUserSubscribe", {
					open_id : data.open_id,
					pro_id : 0
				} );
				return api_success( {
					state : 0,
					msg : "取消订阅成功"
				} );
			}
			else{
				return api_error("5001");
			}
		} );
	}
	//刷新订阅redis
	reloadsub(){
		let mysql = LOAD.mysql(); 
		mysql.sql("SELECT open_id FROM TABLE(user_subscribe) GROUP BY open_id", resuser_subscribe => {
			resuser_subscribe.recursion((i, item, next) => {
				mysql.sql("SELECT pro_id FROM TABLE(user_subscribe) WHERE open_id = '"+ item.open_id +"' ORDER BY sub_time DESC", resuser_sub => {
					this.redis.hset("subscribe_project", item.open_id, resuser_sub);
					next();
				} );
			}, over => {
				mysql.close();
				echo("成功");
				return api_success();
			} );
		} );
	}
	//刷新测试人redis
	reloadusertest(){
		let mysql = LOAD.mysql(); 
		mysql.sql("SELECT `openid` FROM TABLE(user) WHERE `test_state` = 1", resuaertest => {
			this.redis.del("usertest", resdel => {
				resuaertest.recursion((i, item, next) => {
					this.redis.hset("usertest", item.openid, {
						test_state : 1
					} );
					next();
				}, over => {
					mysql.close();
					echo("成功");
					return api_success();
				} );
			} );
		} );
	}
}();
