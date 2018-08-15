const CONFIG = require(`../conf/${ONLINE ? '' : 'local/'}database-mysql`);
const PRIMARY = "id";
class MysqlClass {
	constructor() {
		this.config = CONFIG["default"];
	}
	use(name = "default",conn = false) {
		this.connection = false;
		if ( !CONFIG[name] ) name = "default";
		this.config = CONFIG[name];
		if ( !this.mysql ) this.mysql = require('mysql');
		if ( !this.conn || conn ) {
			this.conn = this.mysql.createConnection( {
			    host : this.config.hostname,
			    user : this.config.username,
			    password : this.config.password,
			    database : this.config.database
			} );
			this.conn.connect();
		}
		return this;
	}
	sql(sql,fn,showsql) {
		if ( !fn || typeof sql != "string" ) return this;
		sql = sql.replace(/TABLE\((.+?)\)/g,`\`${this.config.prefix}$1\``);
		let exec = sql.slice(0,6).toUpperCase();
		if ( showsql ) echo(sql);
		this.conn.query(sql, (err,rows,fields) => {
			if ( err ) {
				echo(`Mysql.query is error:${err}`);
				echo(sql);
			}
			else {
				if ( exec == "INSERT" ) this.insertId = rows.insertId;
				fn(rows && rows.length > 0 ? rows : false,fields);
			}
		} );
		return this;
	}
	get(table,where,order,limit,column,fn,showsql) {
		if ( typeof table != "string" ) return this;
		if ( typeof where == "function" ) {
			fn = where;
			where = "";
			order = "";
			limit = "";
			column = "*";
		}
		else if ( typeof order == "function" ) {
			fn = order;
			order = "";
			limit = "";
			column = "*";
		}
		else if ( typeof limit == "function" ) {
			fn = limit;
			limit = "";
			column = "*";
		}
		else if ( typeof column == "function" ) {
			fn = column;
			column = "*";
		}
		if ( !fn ) return this;
		where = this.where(where);
		order = this.order(order);
		let sql = `SELECT ${column} FROM TABLE(${table})`;
		if ( where ) sql += ` WHERE ${where}`;
		if ( order ) sql += ` ORDER BY ${order}`;
		if ( limit ) sql += ` LIMIT ${limit}`;
		this.sql(sql, data => {
			fn(data);
		}, showsql );
		return this;
	}
	one(table,where,column,order,fn,showsql) {
		if ( typeof table != "string" ) return this;
		if ( typeof column == "function" ) {
			fn = column;
			column = "*";
			order = "";
		}
		else if ( typeof order == "function" ) {
			fn = order;
			order = "";
		}
		if ( !fn ) return this;
		where = this.where(where);
		if ( !where ) return this;
		order = this.order(order);
		let sql = `SELECT ${column} FROM TABLE(${table}) WHERE ${where}`;
		if ( order ) sql += ` ORDER BY ${order}`;
		sql += " LIMIT 1";
		this.sql(sql, data => {
			if ( data ) {
				data = data[0];
				let keys = Object.getOwnPropertyNames(data);
				if ( keys.length == 1 ) data = data[keys[0]];
				fn(data);
			}
			else fn(false);
		}, showsql );
		return this;
	}
	sum(table,where,column,fn,showsql) {
		if ( !fn || typeof table != "string" ) return this;
		where = this.where(where);
		let sql = `SELECT SUM(${column}) \`sum\` FROM TABLE(${table})`;
		if ( where ) sql += ` WHERE ${where}`;
		this.sql(sql, data => {
			if ( data ) fn(data[0]["sum"]);
			else fn(0);
		}, showsql );
		return this;
	}
	rows(table,where,fn,showsql) {
		if ( !fn || typeof table != "string" ) return this;
		where = this.where(where);
		let sql = `SELECT COUNT(1) \`count\` FROM TABLE(${table})`;
		if ( where ) sql += ` WHERE ${where}`;
		this.sql(sql, data => {
			if ( data ) fn(data[0]["count"]);
			else fn(0);
		}, showsql );
		return this;
	}
	random(table,where,column,fn,showsql) {
		if ( typeof table != "string" ) return this;
		if ( typeof where == "function" ) {
			fn = where;
			where = "";
			column = "*";
		}
		else if ( typeof column == "function" ) {
			fn = column;
			column = "*";
		}
		if ( !fn ) return this;
		this.rows(table, where, rows => {
			let i = rand(0,rows - 1);
			this.get(table, where, "", i + ",1", column, data => {
				if ( data ) {
					data = data[0];
					let keys = Object.getOwnPropertyNames(data);
					if ( keys.length == 1 ) data = data[keys[0]];
					fn(data);
				}
				else fn(false);
			}, showsql );
		} );
		return this;
	}
	insert(table,records,fn,showsql) {
		if ( !fn || !records || typeof table != "string" ) return this;
		let sql = "";
		if ( records.isObject ) {
			for ( let [i,item] of entries(records) ) {
				records[i] = typeof item == "object" ? JSON.stringify(item) : addslashes(item);
			}
			let keys = `\`${Object.getOwnPropertyNames(records).join("`,`")}\``;
			let values = `'${records.values().join("','")}'`;
			sql = `INSERT INTO TABLE(${table}) (${keys}) VALUES (${values})`;
		}
		else {
			sql = `INSERT INTO TABLE(${table}) (`;
			let names = new Array();
			for ( let [i,record] of records.entries() ) {
				for ( let [i,item] of entries(record) ) {
					record[i] = typeof item == "object" ? JSON.stringify(item) : addslashes(item);
				}
				if ( i == 0 ) {
					names = Object.getOwnPropertyNames(record);
					sql += `\`${names.join("`,`")}\`) VALUES `;
				}
				else {
					if ( Object.getOwnPropertyNames(record).toString() != names.toString() ) return log("Mysql.insert is error:Fields are inconsistent when multiple insertions");
					sql += ",";
				}
				sql += `('${record.values().join("','")}')`;
			}
		}
		this.sql(sql, data => {
			fn(data);
		}, showsql );
		return this;
	}
	update(table,records,where,fn,showsql) {
		if ( !fn || !records || typeof table != "string" ) return this;
		where = this.where(where);
		if ( !where ) return this;
		let str = new Array();
		for ( let [key,item] of entries(records) ) {
			item = typeof item == "object" ? JSON.stringify(item) : addslashes(item);
			if ( /^(.+) (\+|\-|\*|\/|\%)/i.test(key) ) str.push(key.replace(/^(.+) (\+|\-|\*|\/|\%)/i,`\`$1\`=\`$1\`$2'${item}'`));
			else str.push(`\`${key}\`='${item}'`);
		}
		str = str.join(",");
		let sql = `UPDATE TABLE(${table}) SET ${str} WHERE ${where}`;
		this.sql(sql, data => {
			fn(data);
		}, showsql );
		return this;
	}
	delete(table,where,fn,showsql) {
		if ( !fn || typeof table != "string" ) return this;
		where = this.where(where);
		if ( !where ) return this;
		let sql = `DELETE FROM TABLE(${table}) WHERE ${where}`;
		this.sql(sql, data => {
			fn(data);
		}, showsql );
		return this;
	}
	newOne(table,fn) {
		this.one(table, this.insertId, data => {
			fn(data);
		} );
		return this;
	}
	where(where) {
		if ( where ) {
			if ( typeof where == "object" ) {
				let str = new Array();
				for ( let [key,item] of entries(where) ) {
					if ( /^(.+) (>|>=|<|<=|!=|<>)/i.test(key) ) str.push(key.replace(/^(.+) (>|>=|<|<=|!=|<>)/i,"`$1` $2").replace(' ','') + `'${item}'`);
					else if ( /^(.+) IN/i.test(key) ) str.push(key.replace(/^(.+) IN/i,"`$1` IN") + " ('" + (typeof item == "object" ? item.join("','") : item) + "')");
					else if ( /^(.+) LIKE/i.test(key) ) str.push(key.replace(/^(.+) LIKE/i,"`$1` LIKE") + ` '%${item}%'`);
					else str.push(`\`${key}\`='${item}'`);
				}
				return str.join(" AND ");
			}
			else {
				if ( /^\d+$/.test(where) ) return `\`${PRIMARY}\`='${parseInt(where)}'`;
				else return where;
			}
		}
		return "";
	}
	order(order) {
		if ( order ) {
			let str = new Array();
			if ( typeof order == "object" ) {
				for ( let [key,item] of entries(order) ) {
					str.push(`\`${key}\` ` + (item ? item.toUpperCase() : "ASC"));
				}
				return str.join(",");
			}
			else return order;
		}
		return "";
	}
	close() {
		this.conn.end();
		this.conn = null;
		return this;
	}
}
module.exports = MysqlClass;