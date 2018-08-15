module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	index(){
		if(!post(data => {
			if( !data.game_id || !data.openid ) return api_error(5001);
			else this._getUserGameScoreRedis(data,true);
		} ) )end("Param Error!");
	}
	//评论列表
	commentlist(){
		if(!post(data => {
			if( !data.game_id || !data.openid ) return api_error(5001);
			else this._getUserGameScoreRedis(data, false);
		} ) )end("Param Error!");
	}
	//用户对游戏评论
	usergamescore(){
		if(!post(data => {
			if( !data.openid || !data.game_id || !data.gamecomment ) return api_success();
			else {
				data.gamescore = data.gamescore || 0;
				this._userGameScore(data);
			}
		} ) )end("Param Error!");
	}
	//用户修改游戏评论
	reusergamescore(){
		if(!post(data => {
			if( !data.openid || !data.game_id || !data.gamecomment || !data.gamescore ) return api_success();
			else {
				data.gamescore = data.gamescore || 0;
				this._reUserGameScore(data);
			}
		} ) )end("Param Error!");
	}
	//用户查询游戏评论
	usergamescore_one(){
		if(!post(data => {
			if( !data.openid || !data.game_id ) return api_error(5001);
			else this._userGameScoreone(data);
		} ) )end("Param Error!");
	}
	//评论列表(从redis中查询)
	_getUserGameScoreRedis(data,bool){
		this.redis.hget("user", data.openid, resuser => {
			if( !resuser ) return api_error("4102");
			else {
				if ( !data.page ) data.page = 1;
				let res = {
					nowpage : data.page
				};
				let i = (parseInt(data.page) - 1) * 10;
				data.game_id = decrypt(data.game_id);
				this.redis.hget("gamecomment", data.game_id, resgamecomment => {
					let rescomment = [];
					resgamecomment = resgamecomment || [];
					resgamecomment.recursion((i,item,next) => {
						this.redis.hget("user", item.openid, resuser => {
							delete item.openid;
							delete item.game_id;
							delete item.update_time;
							item.com_time = parseInt(item.com_time).timeFormat("%Y-%m-%d");
							if( typeof item.state == "undefined" || item.state == 1 ) {
								if( item.state ) delete item.state;
								item.nick = resuser.nick ? resuser.nick : "用户";
								item.headimg = resuser.headimg ? resuser.headimg : "https://vgame-cdn.edisonluorui.com/upload/2018/0802/20180802093552794.jpg";
								rescomment.push(item);
							}
							next();
						} );
					}, over => {
						res.resgames_com = rescomment.slice( i, i + 10 );
						res.totalpage = parseInt((rescomment.length + 9) / 10);
						this.redis.hget("game", data.game_id, resgame => {
							if(bool) {
								res.times = resgame.times;
								res.score = parseFloat(resgame.score).toFixed(1);
							}
							return api_success(res);
						} );
					} );
				} );
			}
		} );
	}
	//评论列表(从数据库中查询)
	_getUserGameScoreMysql(data,bool){
		this.redis.hget("user", data.openid, resuser => {
			if( !resuser ) return api_error("4102");
			else {
				if ( !data.page ) data.page = 1;
				let res = {
					nowpage : data.page
				};
				data.game_id = decrypt(data.game_id);
				let mysql = LOAD.mysql();
				mysql.get("_usergamescore", {
					game_id : data.game_id
				}, "`com_time` DESC,`id` DESC", ( data.page - 1 ) * 15+",15","nick,headimg,score,game_com,com_time", resgamescore => {
					resgamescore = resgamescore || [];
					resgamescore.recursion((i,item,next) => {
						item.com_time = item.com_time.timeFormat("%Y-%m-%d");
						next();
					}, over => {
						this.redis.hget("game", data.game_id, resgame => {
							if(bool) {
								res.times = resgame.times;
								res.score = parseFloat(resgame.score).toFixed(1);
							}
							res.resgames_com = resgamescore;
							res.totalpage = parseInt((parseInt(resgame.times) + 14) / 15);
							return api_success(res);
						});
					} );
				} );
			}
		} );
	}
	//用户对游戏评论
	_userGameScore(data){
		this.redis.hget("user", data.openid, resuser => {
			if( !resuser ) return api_error(4102);
			else{
				let gamecomment = delslashes(data.gamecomment);
				LOAD.library("baidu").spam(gamecomment, res => {
					if ( !res.status ) {
						return api_error(5010);
					}
					else {
						data.game_id = decrypt(data.game_id);
						this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
							resuserplaygameresult = resuserplaygameresult || [];
							let i = resuserplaygameresult.search( {
								game_id : data.game_id
							} );
							if( i === false ){
								//处理用户解锁成功后出现的弹框
								return api_success();
							}
							else{
								this.redis.hget("usergamecomment", data.openid, resusergamecomment => {
									resusergamecomment = resusergamecomment || [];
									let i = resusergamecomment.search( {
										game_id : data.game_id
									} );
									if( i === false ){
										this.redis.hget("game", data.game_id, resgame => {
											//游戏分数
											resgame.score = parseFloat(resgame.score).toFixed(1);
											//用户评论后的游戏分数
											resgame.score = (Number(parseFloat(resgame.score * resgame.times).toFixed(1)) + parseInt(data.gamescore)) / (parseInt(resgame.times) + 1);
											//评论人数
											resgame.times = parseInt(resgame.times) + 1;
											//更改redis游戏信息
											this.redis.hset("game", data.game_id, resgame);
											//更改库里游戏信息
											let updategame = {
												score : resgame.score,
												times : resgame.times,
												id : data.game_id
											};
											rlog("updateGame", updategame);	
											//存储用户评论redis
											let usergamescore = {
												openid : data.openid,
												game_id : encrypt(data.game_id),
												score : data.gamescore,
												game_com : gamecomment,
												com_time : time(),
												state : 1,
												update_time : ""
											};
											this.redis.hget("gamecomment", data.game_id, resgamecomment => {
												resgamecomment = resgamecomment || [];
												// if( resgamecomment.length >= 3 ) resgamecomment.pop();
												resgamecomment.unshift(usergamescore);
												this.redis.hset("gamecomment", data.game_id, resgamecomment);
												//存储用户评论redis
												resusergamecomment.unshift( {
													game_id : data.game_id,
													score : data.gamescore,
													game_com : gamecomment
												} );
												this.redis.hset("usergamecomment", data.openid, resusergamecomment);
												//存储用户评论
												usergamescore.game_id = data.game_id;
												usergamescore.user_id = resuser.id;
												usergamescore.headimg = resuser.headimg;
												usergamescore.nick = resuser.nick;
												rlog("addUserGameScore", usergamescore);
												return api_success("评论成功！");
											} );
										} );
									}
									else {
										return api_success();
									}
								} );
							}
						} );
					}
				} );
			}
		} );
	}
	//用户修改游戏评论
	_reUserGameScore(data){
		this.redis.hget("user", data.openid, resuser => {
			if( !resuser ) return api_error(4102);
			else {
				let gamecomment = delslashes(data.gamecomment);
				LOAD.library("baidu").spam(gamecomment, res => {
					if ( !res.status ) return api_error(5010);
					else {
						data.game_id = decrypt(data.game_id);
						this.redis.hget("gamecomment", data.game_id, resgamecomment => {
							resgamecomment = resgamecomment || [];
							let i = resgamecomment.search( {
								openid : data.openid
							} );
							if( i !== false ){
								//修改游戏信息分数
								this.redis.hget("game", data.game_id, resgame => {
									if( !resgame ) return api_error(4501);
									else{ 
										resgame.score = (Number(parseFloat(resgame.score * resgame.times).toFixed(1)) - parseInt(resgamecomment[i].score) + parseInt(data.gamescore)) / resgame.times;
										//更改redis游戏分数
										this.redis.hset("game", data.game_id, resgame, over => {
											//更改数据库游戏分数
											rlog("updateGameScore", {
												id : data.game_id,
												score : resgame.score
											} );
										} );
										resgamecomment[i].score = data.gamescore;
										resgamecomment[i].game_com = gamecomment;
										resgamecomment[i].update_time = time();
										this.redis.hset("gamecomment", data.game_id, resgamecomment);
									}
								} );
								//修改存储用户评论redis
								this.redis.hget("usergamecomment", data.openid, resusergamecomment => {
									resusergamecomment = resusergamecomment || [];
									let  i = resusergamecomment.search( {
										game_id : data.game_id
									} );
									if( i !== false ){
										resusergamecomment[i].score = data.gamescore;
										resusergamecomment[i].game_com = gamecomment;
										this.redis.hset("usergamecomment", data.openid, resusergamecomment);
									}
									else {
										resusergamecomment.unshift( {
											game_id : data.game_id,
											score : data.gamescore,
											game_com : gamecomment
										} );
										this.redis.hset("usergamecomment", data.openid, resusergamecomment);
									}
								} );
								rlog("addUserGameScore", {
									game_id : data.game_id,
									user_id : resuser.id,
									nick : resuser.nick,
									headimg : resuser.headimg,
									score : data.gamescore,
									game_com : gamecomment,
									com_time : time()
								} );
								return api_success("评论成功！");
							}
							else {
								return api_error(4401);
							}
						} );
					}
				} );
			}
		} );
	}
	//用户查询游戏评论
	_userGameScoreone(data){
		this.redis.hget("usergamecomment", data.openid, resusergamecomment => {
			resusergamecomment = resusergamecomment || [];
			let i = resusergamecomment.search( {
				game_id : decrypt(data.game_id)
			} );
			if( i !== false ){
				delete resusergamecomment[i].game_id;
				resusergamecomment[i].com_state = 1;
				return api_success(resusergamecomment[i]);
			}
			else return api_success( {
				com_state : 0,
				score: 0,
				game_com :""
			} );
		} );
	}
	//刷新用户评论redis
	resloaduserscore(){
		let mysql = LOAD.mysql();
		mysql.sql("SELECT g.user_id,u.openid FROM TABLE(usergamescore) g,TABLE(user) u WHERE g.user_id = u.id GROUP BY g.user_id", resuser => {
			resuser.recursion((i, item, next) => {
				mysql.sql("SELECT game_id,score,game_com FROM TABLE(usergamescore) WHERE user_id = " + item.user_id + " ORDER BY com_time DESC", rescore => {
					rescore.recursion((i,item1,next1) => {
						item1.game_com = delslashes(item.game_com);
						next1();
					}, over => {
						this.redis.hset("usergamecomment", item.openid, rescore, res => {
							next();
						} );
					} );
				} );
			}, over => {
				mysql.close();
				echo("成功");
				return api_success();
			} );
		} );
	}
	//刷新游戏评论redis
	resloadgamescore(){
		let mysql = LOAD.mysql(); 
		mysql.sql("SELECT game_id FROM TABLE(usergamescore) GROUP BY game_id", resgames => {
			resgames.recursion((i, item, next) => {
				mysql.sql("SELECT u.openid,g.game_id,g.score,g.game_com,g.com_time,g.state * 1 state FROM TABLE(user) u,TABLE(usergamescore) g WHERE u.id = g.user_id AND g.game_id = "+ item.game_id +" ORDER BY g.com_time DESC", gamescore => {
					gamescore.recursion((j,item1,next1) => {
						item1.nick = delslashes(item1.nick);
						item1.game_com = delslashes(item1.game_com);
						item1.game_id = encrypt(String(item1.game_id));
						item1.update_time = "";
						next1();
					}, over => {
						this.redis.hset("gamecomment", item.game_id, gamescore, res => {
							next();
						} );
					} );
				} );
			}, over => {
				mysql.close();
				echo("成功");
				return api_success();
			} );
		} );
	}
}();