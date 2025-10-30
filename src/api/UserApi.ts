import { AxiosResponse } from "axios";
import { GetReferalsType, UserType } from "@/zustand/user_store/UserStore";
import { instance } from "./Api";




export const UserApi = {
    async InitialUser(user: UserType): Promise<AxiosResponse> {
        const response = await instance.post<UserType, Promise<AxiosResponse>>('user/check_user', user)
        return response

    },

    async GetReferals(userId: GetReferalsType): Promise<AxiosResponse> {
        const response = await instance.post<number, Promise<AxiosResponse>>('user/get_referals', userId)
        return response
    }

}