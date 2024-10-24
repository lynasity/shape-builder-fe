// import { getToken,setToken } from "./tokenManager";

type user = {
  userid:string,
  brandId:string,
  status?:string,
  shape_fill_credits?:number,
  image_fill_credits?:number,
  expiredTime?:string
}

// 获取服务端解析 jwt 后的数据
export function login(token): Promise<user> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch("https://percentfill-backend--partfill.us-central1.hosted.app/api/login", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          mode: "cors", // 启用跨域请求
        });
  
        if (response.ok) {
          const userInfo:user = await response.json();
          resolve(userInfo); // 将数据通过 resolve 返回
        } else {
          // 如果 response 不是 2xx，抛出错误
          reject(`Error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        reject(error); // 捕获 fetch 或其他内部错误
      }
    });
  }

  export function subCredits(token:string|null,type:string): Promise<user> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch("https://percentfill-backend--partfill.us-central1.hosted.app/api/subCredits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          mode: "cors", // 启用跨域请求
          body: JSON.stringify({ type: type }) 
        });
  
        if (response.ok) {
          const userInfo = await response.json();
          resolve(userInfo); // 将数据通过 resolve 返回
        } else {
          // 如果 response 不是 2xx，抛出错误
          reject(`Error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        reject(error); // 捕获 fetch 或其他内部错误
      }
    });
  }

  export default login;