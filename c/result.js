module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//用户游戏生成结果
	usergameresult(){
		if(!post(data => {
			if( !data.openid || !data.game_id || !data.newhand || typeof data.end == "undefined" ) return api_error("5001");
			else this._userGameresultTwo(data);
		} ) )end("Param Error!");
	}
	//用户游戏生成结果(二期)
	_userGameresultTwo(data){
		let res = {};
		data.game_id = decrypt(data.game_id);
		this.redis.hget("game", data.game_id, resgame => {
			if( !resgame ) return api_error(4901);
			if(  resgame.result_guide == 1 ){
				if( data.end != "a" && data.end != "b" && data.end != "c" && data.end != "d" ){
					data.end = "c";
				}
				let min = parseInt(resgame.result.setting[data.end.toLowerCase()][0]);
				let max = parseInt(resgame.result.setting[data.end.toLowerCase()][1]);
				res.result_score = rand(min,max);
				data.res = res;
				saveresult.call(this, data, resgame);
			}
			else if( resgame.result_guide == 2 ){
				//后台设置最小值
				let resultmin = resgame.result.setting.d[0];
				/*let re = /^[1-9]+[0-9]*]*$/;
				if(isNaN(data.end)){
					res.result_score = parseInt(resultmin) + 10;
				}
				else{
					res.result_score = parseInt(resultmin) + parseInt(data.end);
				}*/
				res.result_score = parseInt(resultmin) + (isNaN(data.end) ? 10 : parseInt(data.end));
				data.res = res;
				if(res.result_score > resgame.result.setting.a[2][0].max) {
					data.end = "a";
					saveresult.call(this, data, resgame);
				}
				else if(res.result_score > resgame.result.setting.b[2][0].max) {
					data.end = "b";
					saveresult.call(this, data, resgame);
				}
				else if(res.result_score > resgame.result.setting.c[2][0].max) {
					data.end = "c";
					saveresult.call(this, data, resgame);
				}
				else{
					data.end = "d";
					saveresult.call(this, data, resgame);
				}
			}
			else {
				return api_error("4901");
			}
			function saveresult(data,gameinfo) {
				//用于用户重新开始还是继续游戏
				this.redis.hget("startgame", data.openid, restartgame => {
					restartgame = restartgame || [];
					let i = restartgame.search( {
						game_id : data.game_id
					} );
					if( i !== false ){
						restartgame[i].state = 1;
						this.redis.hset("startgame", data.openid, restartgame);
					}
					else{
						restartgame.unshift( {
							game_id : data.game_id,
							state : 1
						} );
						this.redis.hset("startgame", data.openid, restartgame);
					}
				} );
				//往数据库中插入用户结果
				this.redis.hget("user", data.openid, resuser => {
					let usergameresult = {
						gr_grade : data.end,
						user_id : resuser.id,
						nick : resuser.nick,
						game_id : data.game_id,
						gr_score : data.res.result_score,
						gr_time : time()
					};
					rlog("userGameResult", usergameresult);
					//用户结果存储redis
					this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
						resuserplaygameresult = resuserplaygameresult || [];
						let i = resuserplaygameresult.search( {
							game_id : data.game_id
						} );
						if( i !== false ){
							resuserplaygameresult.splice(i,1);
						}
						let gameresult = {
							grade : data.end,
							result_score : data.res.result_score,
							game_id : data.game_id,
							time : usergameresult.gr_time.timeFormat("%Y-%m-%d")
						};
						resuserplaygameresult.unshift(gameresult);
						this.redis.hset("userplaygameresult", data.openid, resuserplaygameresult);
						//用户历史结果记录redis(按游戏区分)
						this.redis.hget("usergameresulthistory", data.openid + data.game_id, resusergameresulthistory => {
							resusergameresulthistory = resusergameresulthistory || [];
							resusergameresulthistory.unshift(gameresult);
							this.redis.hset("usergameresulthistory", data.openid + data.game_id, resusergameresulthistory);
						} );
						//用户历史结果记录redis(不按游戏区分)
						this.redis.hget("usergameresulthistory", data.openid, resusergameresulthistory => {
							resusergameresulthistory = resusergameresulthistory || [];
							resusergameresulthistory.unshift(gameresult);
							this.redis.hset("usergameresulthistory", data.openid + data.game_id, resusergameresulthistory);
						} );
					} );
					//结束游戏计算此次游戏时间
					this.redis.hget("usergametime", resuser.id, resusergametime => {
						resusergametime = resusergametime || {};
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
						} );
						rlog("over_tg_gameontime",userontime);
					} );
				} );
				this.redis.hget("friendship", data.openid, resfriendship => {
					resfriendship = resfriendship || [];
					resfriendship.recursion((i,item,next) => {
						this.redis.hget("userplaygameresult", item, resgameresult => {
							resgameresult = resgameresult || [];
							let i = resgameresult.search( {
								game_id : data.game_id
							} );
							if( i === false ) next();
							else {
								this.redis.hget("friendship", item, friendship => {
									friendship = friendship || [];
									if( friendship.search(data.openid) !== false ) {
										//最外层圆点
										this.redis.hset("userrecordstate", item, {
											record_state : 1
										} );
										//游戏列表圆点
										this.redis.hset("userrecordgamestate", item + data.game_id, {
											gamerecord_state : 1
										} );
										//好友列表圆点
										this.redis.hset("friendrecordgamestate", item + data.openid + data.game_id, {
											friendrecord_state : 1
										} );
										next();
									}
									else next();
								} );
							}
						} );
					}, over => {
						return api_success();
					} );
				} );
			}
		} );
	}
	//用户游戏生成结果(一期)
	_userGameresult(data){
		let res = {};
		data.game_id = decrypt(data.game_id);
		this.redis.hget("game", data.game_id, resgame => {
			if( !resgame ) return api_error(4901);
			if(  resgame.result_guide == 1 ){
				if( data.end != "a" && data.end != "b" && data.end != "c" && data.end != "d" ){
					data.end = "c";
				}
				let min = parseInt(resgame.result.setting[data.end.toLowerCase()][0]);
				let max = parseInt(resgame.result.setting[data.end.toLowerCase()][1]);
				res.result_score = rand(min,max);
				data.res = res;
				saveresult.call(this, data, resgame);
			}
			else if( resgame.result_guide == 2 ){
				//后台设置最小值
				let resultmin = resgame.result.setting.d[0];
				let re = /^[1-9]+[0-9]*]*$/;
				if(!re.test(data.end)){
					res.result_score = parseInt(resultmin) + 10;
				}
				else{
					res.result_score = parseInt(resultmin) + parseInt(data.end);
				}
				data.res = res;
				if(res.result_score > resgame.result.setting.a[2][0].max) {
					data.end = "a";
					saveresult.call(this, data, resgame);
				}
				else if(res.result_score > resgame.result.setting.b[2][0].max) {
					data.end = "b";
					saveresult.call(this, data, resgame);
				}
				else if(res.result_score > resgame.result.setting.c[2][0].max) {
					data.end = "c";
					saveresult.call(this, data, resgame);
				}
				else{
					data.end = "d";
					saveresult.call(this, data, resgame);
				}
			}
			else {
				return api_error("4901");
			}
			function saveresult(data,gameinfo) {
				//用于用户重新开始还是继续游戏
				this.redis.hget("startgame", data.openid, restartgame => {
					restartgame = restartgame || [];
					let i = restartgame.search( {
						game_id : data.game_id
					} );
					if( i !== false ){
						restartgame[i].state = 1;
						this.redis.hset("startgame", data.openid, restartgame);
					}
					else{
						restartgame.unshift( {
							game_id : data.game_id,
							state : 1
						} );
						this.redis.hset("startgame", data.openid, restartgame);
					}
				} );
				res.result = {};
				if(data.res.result_score > gameinfo.result.setting[data.end][2][0].max){
					res.result.title = gameinfo.result.setting[data.end][2][1].title;
					res.result.content = gameinfo.result.setting[data.end][2][1].content;
				}
				else {
					res.result.title = gameinfo.result.setting[data.end][2][0].title;
					res.result.content = gameinfo.result.setting[data.end][2][0].content;
				}
				//往数据库中插入用户结果
				this.redis.hget("user", data.openid, resuser => {
					let usergameresult = {
						gr_grade : data.end,
						user_id : resuser.id,
						nick : resuser.nick,
						game_id : data.game_id,
						gr_score : data.res.result_score,
						gr_time : time()
					};
					rlog("userGameResult", usergameresult);
					//用户做新手任务
					/*if( decrypt(data.newhand) == 1 ){
						let newhand = {
							user_id : resuser.id,
							game_id : data.game_id,
							newhandtime : time(),
							result_state : 1 
						};
						rlog("addNewHand", newhand);
					}*/
					//用户结果存储redis
					this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
						resuserplaygameresult = resuserplaygameresult || [];
						let i = resuserplaygameresult.search( {
							game_id : data.game_id
						} );
						if( i !== false ){
							resuserplaygameresult.splice(i,1);
						}
						let gameresult = {
							grade : data.end,
							result : data.res.result,
							result_score : data.res.result_score,
							game_id : data.game_id,
							time : usergameresult.gr_time.timeFormat("%Y-%m-%d")
						};
						resuserplaygameresult.unshift(gameresult);
						this.redis.hset("userplaygameresult", data.openid, resuserplaygameresult);
						//用户历史结果记录redis(按游戏区分)
						this.redis.hget("usergameresulthistory", data.openid + data.game_id, resusergameresulthistory => {
							resusergameresulthistory = resusergameresulthistory || [];
							resusergameresulthistory.unshift(gameresult);
							this.redis.hset("usergameresulthistory", data.openid + data.game_id, resusergameresulthistory);
						} );
						//用户历史结果记录redis(不按游戏区分)
						this.redis.hget("usergameresulthistory", data.openid, resusergameresulthistory => {
							resusergameresulthistory = resusergameresulthistory || [];
							resusergameresulthistory.unshift(gameresult);
							this.redis.hset("usergameresulthistory", data.openid + data.game_id, resusergameresulthistory);
						} );
					} );
					//结束游戏计算此次游戏时间
					this.redis.hget("usergametime", resuser.id, resusergametime => {
						resusergametime = resusergametime || {};
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
						} );
						//rlog("over_tg_gameontime",userontime);
					} );
				} );
				this.redis.hget("friendship", data.openid, resfriendship => {
					resfriendship = resfriendship || [];
					resfriendship.recursion((i,item,next) => {
						this.redis.hget("userplaygameresult", item, resgameresult => {
							resgameresult = resgameresult || [];
							let i = resgameresult.search( {
								game_id : data.game_id
							} );
							if( i === false ) next();
							else {
								//最外层圆点
								this.redis.hset("userrecordstate", item, {
									record_state : 1
								} );
								//游戏列表圆点
								this.redis.hset("userrecordgamestate", item + data.game_id, {
									gamerecord_state : 1
								} );
								//好友列表圆点
								this.redis.hset("friendrecordgamestate", item + data.openid + data.game_id, {
									friendrecord_state : 1
								} );
								next();
							}
						} );
					}, over => {
						return api_success();
					} );
				} );
			}
		} );
	}
}();