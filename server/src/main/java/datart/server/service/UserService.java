/*
 * Datart
 * <p>
 * Copyright 2021
 * <p>
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * <p>
 * http://www.apache.org/licenses/LICENSE-2.0
 * <p>
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package datart.server.service;

import datart.core.base.consts.UserIdentityType;
import datart.core.entity.User;
import datart.core.entity.ext.UserBaseInfo;
import datart.core.mappers.ext.UserMapperExt;
import datart.security.base.PasswordToken;
import datart.server.base.dto.UserProfile;
import datart.server.base.params.*;

import javax.mail.MessagingException;
import java.io.UnsupportedEncodingException;
import java.util.List;


public interface UserService extends BaseCRUDService<User, UserMapperExt> {

    UserProfile getUserProfile();

    List<UserBaseInfo> listUsersByKeyword(String keyword);

    User getUserByName(String username);

    boolean register(UserRegisterParam user) throws MessagingException, UnsupportedEncodingException;

    String activeUser(String activeString);

    boolean sendActiveMail(String usernameOrEmail) throws UnsupportedEncodingException, MessagingException;

    boolean changeUserPassword(ChangeUserPasswordParam passwordParam);

    boolean updateAvatar(String path);

    String login(PasswordToken passwordToken);

    String forgetPassword(UserIdentityType type, String principal);

    boolean resetPassword(UserResetPasswordParam passwordParam);

}
