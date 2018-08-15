module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//可匹配游戏列表
	index(){
		if(!post(data => {
			if( !data.openid ) return api_error("5001");
			else this._getAllMateGame(data);
		} ) )end("Param Error!");
	}
	//用户查询好友匹配
	friendmate(){
		if(!post(data => {
			if( !data.openid || !data.game_id ) return api_error("5001");
			else this._friendMate(data);
		} ) )end("Param Error!");
	}
	//用户点击生成图片
	friendmatepic(){
		if(!post(data => {
			if( !data.openid || !data.game_id || !data.friend_openid ) return api_error("5001");
			else this._friendMatePic(data);
		} ) )end("Param Error!");
	}
	//好友分享
	friendship(){
		if(!post(data => {
			if( !data.openid ) return api_success();
			else this._getFriendShip(data);
		} ) )end("Param Error!");
	}
	//好友分享下标
	friendpic(){
		if(!post(data => {
			this._friendPic();
		} ) )end("Param Error!");
	}
	//好友删除
	frienddel(){
		if(!post(data => {
			if( !data.openid || !data.friend_openid ) return api_error("5001");
			else this._friendDel(data);
		} ) )end("Param Error!");
	}
	//好友删除(二期)
	_friendDel(data){
		this.redis.hget("friendship", data.openid, resfriendship => {
			resfriendship = resfriendship || [];
			let i = resfriendship.search(data.friend_openid);
			if( i !== false ){
				resfriendship.splice(i, 1);
				if( resfriendship.length == 0 ) this.redis.hdel("friendship", data.openid);
				else this.redis.hset("friendship", data.openid, resfriendship);
				this.redis.hget("user", data.openid, resopenid => {
					this.redis.hget("user", data.friend_openid, resfriend_openid => {
						//删除数据库里好友
						if( resopenid && resfriend_openid ) rlog("delfriendship", {
							userone_id : resopenid.id,
							usertwo_id : resfriend_openid.id
						} );
					} );
				} );
			}
			return api_success("删除成功");
		} );
	}
	//可匹配游戏列表(一期)(二期)
	_getAllMateGame(data){
		let res = [];
		this.redis.hget("userplaygame", data.openid, resuserplaygame => {
			resuserplaygame = resuserplaygame || [];
			this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
				resuserplaygameresult = resuserplaygameresult || [];
				resuserplaygame.recursion((i,item,next) => {
					let game = {};
					this.redis.hget("game", item, resgame => {
						if( !resgame ) next();
						else {
							game.game_id = encrypt(item);
							game.name = resgame.name;
							let j = resuserplaygameresult.search( {
								game_id : item
							} );
							if( j === false ){
								game.gamerecord_red_state = 0;
								res.push(game);
								next();
							}
							else{
								//游戏圆点
								this.redis.hget("userrecordgamestate", data.openid + item, resuserrecordgamestate => {
									if( !resuserrecordgamestate || resuserrecordgamestate.gamerecord_state == 0) game.gamerecord_red_state = 0;
									else  game.gamerecord_red_state = 1;
									res.push(game);
									next();
								} );
							}
						}
					} );
				}, over => {
					return api_success(res);
				} );
			} );
		} );
	}
	//用户查询好友匹配(一期)(二期)
	_friendMate(data){
		let res = [];
		data.game_id = decrypt(data.game_id);
		this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
			resuserplaygameresult = resuserplaygameresult || [];
			let n = resuserplaygameresult.search( {
				game_id : data.game_id
			} );
			if( n !== false ){
				this.redis.hget("friendship", data.openid, resfriendship => {
					resfriendship = resfriendship || [];
					resfriendship.recursion((i,item,next) => {
						this.redis.hget("userplaygameresult", item, resfriendplaygameresult => {
							resfriendplaygameresult = resfriendplaygameresult || [];
							let j = resfriendplaygameresult.search( {
								game_id : data.game_id
							} );
							if( j !== false ){
								let gameitem = {};
								this.redis.hget("game", data.game_id, resgame => {
									if( !resgame ) next();
									else {
										this.redis.hget("user", item, resuser => {
											if( !resuser ) next();
											else {
												gameitem.friend = {
													friend_openid : encrypt(item),
													headimg : resuser.headimg,
													nick : resuser.nick
												};
												this.redis.hget("friendrecordgamestate", data.openid + item + data.game_id, resrecordgamestate => {
													if( !resrecordgamestate || resrecordgamestate.friendrecord_state == 0 ) gameitem.friendrecord_red_state = 0;
													else gameitem.friendrecord_red_state = 1;
													gameitem.friend_score = resgame.result.relation[resuserplaygameresult[n].grade+resfriendplaygameresult[j].grade] || resgame.result.relation[resfriendplaygameresult[j].grade + resuserplaygameresult[n].grade];
													delete gameitem.friend_score.title;
													delete gameitem.friend_score.content;
													gameitem.game_id = encrypt(String(data.game_id));
													res.push(gameitem);
													next();
												} );
											}
										} );
									}
								} );
							}
							else {
								next();
							}
						} );
					}, over => {
						let arr = [];
						let num = res.length;
						for( let i=0; i < num; i++ ){
							if( typeof res[i] != "undefined" && res[i] && res[i] != null ){
								arr.push(res[i]);
							}
						}
						return api_success(arr);
					} );
				} );
			}
			else{
				return api_success(res);
			}
		} );
	}
	//用户点击生成图片(同时清除红点)
	_friendMatePic(data){
		data.game_id = decrypt(data.game_id);
		data.friend_openid = decrypt(data.friend_openid);
		this.redis.hget("game", data.game_id, resgame => {
			this.redis.hget("friendrecordgamestate", data.openid + data.friend_openid + data.game_id, resrecordgamestate => {
				resrecordgamestate = resrecordgamestate || {};
				resrecordgamestate.friendrecord_state = 0;
				this.redis.hset("friendrecordgamestate", data.openid + data.friend_openid + data.game_id, resrecordgamestate, res => {
					this.redis.hget("friendship", data.openid, resfriendship => {
						resfriendship = resfriendship || [];
						resfriendship.recursion((i,item,next) => {
							this.redis.hget("friendrecordgamestate", data.openid + item + data.game_id, resotherfriendplaygameresult => {
								if( !resotherfriendplaygameresult || resotherfriendplaygameresult.friendrecord_state == 0) next();
								else {
									this.redis.hget("userrecordgamestate", data.openid + data.game_id, resuserrecordgamestate => {
										resuserrecordgamestate = resuserrecordgamestate || {};
										resuserrecordgamestate.gamerecord_state = 1;
										this.redis.hset("userrecordgamestate", data.openid + data.game_id, resuserrecordgamestate);
									} );
									friendresultpic.call(this, data, resgame);
								}
							} );
						}, over => {
							this.redis.hget("userrecordgamestate", data.openid + data.game_id, resuserrecordgamestate => {
								resuserrecordgamestate = resuserrecordgamestate || {};
								resuserrecordgamestate.gamerecord_state = 0;
								this.redis.hset("userrecordgamestate", data.openid + data.game_id, resuserrecordgamestate);
								this.redis.hget("userrecordstate", data.openid, resuserrecordstate => {
									resuserrecordstate = resuserrecordstate || {};
									resuserrecordstate.record_state = 0;
									this.redis.hset("userrecordstate", data.openid, resuserrecordstate);
								} );
							} );
							friendresultpic.call(this, data, resgame);
						} );
					} );
				} );
			} );
		} );
		function friendresultpic(data, game) {
			this.redis.hget("userplaygameresult", data.openid, resuserplaygameresult => {
				resuserplaygameresult = resuserplaygameresult || [];
				this.redis.hget("userplaygameresult", data.friend_openid, resfriendplaygameresult => {
					resfriendplaygameresult = resfriendplaygameresult || [];
					let n = resuserplaygameresult.search( {
						game_id : data.game_id
					} );
					let m = resfriendplaygameresult.search( {
						game_id : data.game_id
					} );
					this.redis.hget("user", data.friend_openid, resfriend => {
						let obj = game.result.relation[resuserplaygameresult[n].grade + resfriendplaygameresult[m].grade] || game.result.relation[resfriendplaygameresult[m].grade + resuserplaygameresult[n].grade];
						return api_success( {
							friend_id : resfriend.openid,
							friend_hendimg : resfriend.headimg,
							friend_nick : resfriend.nick,
							pic_content : obj
						} );
					} );
				} );
			} );
		}
	}
	//好友分享(一期)(二期)
	_getFriendShip(data){
		if( !data.sender && !data.sendeid ) return api_success();
		else {
			if( !data.sendeid ){
				if( data.sender == data.openid ) return api_success();
				else {
					rlog("friendship", {
					openid : data.openid,
					sender : data.sender
					} );
					return api_success();
				}
			}
			else{
				let mysql = LOAD.mysql(); 
				mysql.one("user", {
					id : data.sendeid
				}, resuser => {
					mysql.close();
					if( !resuser ) return api_success();
					else {
						if( resuser.openid == data.openid ) return api_success();
	                    else {
	                    	rlog("friendship", {
	                          openid : data.openid,
	                          sender : resuser.openid
	                        } );
	                        return api_success();
	                    }
					}
				} );
			}
		}
	}
	//好友分享下标
	_friendPic(){
		this.redis.get("sharepic", res => {
			return api_success(res);
		} );
	}
}();
