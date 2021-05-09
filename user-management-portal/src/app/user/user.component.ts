import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { NotificationType } from '../enum/notification-type.enum';
import { CustomHttpResponse } from '../model/custom-http-response';
import { User } from '../model/user';
import { AuthenticationService } from '../service/authentication.service';
import { NotificationService } from '../service/notification.service';
import { UserService } from '../service/user.service';
import {FileUploadStatus} from '../model/file-upload-status';
import {Role} from '../enum/role.enum';
import { SubSink } from 'subsink';
@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit,OnDestroy {

  private subs=new SubSink();
  private titleSubject = new BehaviorSubject<string>('Users');
  public titleAction$ = this.titleSubject.asObservable();
  public users: User[];
  public refreshing: boolean;
  public selectedUser: User;
  public fileName: string;
  public profileImage: File;
  public editUser = new User();
  private currentUsername: string;
  public user: User;
  public fileStatus=new FileUploadStatus();



  constructor(private userService: UserService,
    private notificationService: NotificationService,
    private authenticationService: AuthenticationService,
    private router:Router) { }

  ngOnInit(): void {
    this.user=this.authenticationService.getUserFromLocalCache();
    this.getUsers(true);
  }

  public changeTitle(title: string): void {
    this.titleSubject.next(title);
  }

  public getUsers(showNotification: boolean): void {
    this.refreshing = true;
    this.subs.add(
      this.userService.getUsers().subscribe(
        (response: User[]) => {
          this.userService.addUsersToLocalCache(response);
          this.users = response;
          this.refreshing = false;
          if (showNotification) {
            this.sendNotification(NotificationType.SUCCESS, `${response.length} user(s) loaded successfully.`);
          }
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.message);
          this.refreshing = false;
        }
      )
    );
  }

  public onSelectUser(selectedUser: User): void {
    this.selectedUser = selectedUser;
    this.clickButton('openUserInfo');
  }

  public onProfileImageChange(fileName: string, profileImage: File): void {
    this.fileName = fileName;
    this.profileImage = profileImage
  }

  public saveNewUser(): void {
    this.clickButton('new-user-save');
  }

  public onAddNewUser(userForm: NgForm): void {
    const formData = this.userService.createUserFormData(null, userForm.value, this.profileImage);

    this.subs.add(
      this.userService.addUser(formData).subscribe(
        (response: User) => {
          this.clickButton('new-user-close');
          this.getUsers(false);
          this.fileName = null;
          this.profileImage = null;
          userForm.reset();
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} added successfully.`);

        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.message);
          this.profileImage = null;
        }
      )
    );
  }

  public searchUsers(searchTerm: string): void {
    const results: User[] = [];
    for (const user of this.userService.getUsersFromLocalCache()) {

      if (user.firstName.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 ||
        user.lastName.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 ||
        user.username.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 ||
        user.userId.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1) {
        results.push(user);
      }

    }

    this.users = results;
    if (results.length == 0 || !searchTerm) {
      this.users = this.userService.getUsersFromLocalCache();
    }
  }

  public onEditUser(editUser: User): void {
    this.editUser = editUser;
    this.currentUsername = editUser.username;
    this.clickButton('openUserEdit');
  }

  public onUpdateUser(): void {
    const formData = this.userService.createUserFormData(this.currentUsername, this.editUser, this.profileImage);

    this.subs.add(
      this.userService.updateUser(formData).subscribe(
        (response: User) => {
          this.clickButton('closeEditUserModalButton');
          this.getUsers(false);
          this.fileName = null;
          this.profileImage = null;
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} updated successfully.`);

        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.message);
          this.profileImage = null;
        }
      )

    );
  }

  public onDeleteUser(username: string): void {
    this.subs.add(
      this.userService.deleteUser(username).subscribe(
        (response: CustomHttpResponse) => {
          this.sendNotification(NotificationType.SUCCESS, response.message);
          this.getUsers(false);
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.message);
          this.profileImage = null;
        }
      )
    );
  }

  public onResetPassword(emailForm: NgForm): void {
    this.refreshing = true;
    const emailAddress = emailForm.value['reset-password-email']
    this.subs.add(
      this.userService.resetPassword(emailAddress).subscribe(
        (response: CustomHttpResponse) => {
          this.sendNotification(NotificationType.SUCCESS, response.message);
          this.refreshing = false;
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.message);
          this.refreshing = false;
        },
        () => emailForm.reset()
      )
    );
  }

  public onUpdateCurrentUser(user:User):void{
    this.refreshing=true;
    this.currentUsername=this.authenticationService.getUserFromLocalCache().username;
    const formData = this.userService.createUserFormData(this.currentUsername, user, this.profileImage);

    this.subs.add(
      this.userService.updateUser(formData).subscribe(
        (response: User) => {
          this.authenticationService.addUserToLocalCache(response);
          this.getUsers(false);
          this.fileName = null;
          this.profileImage = null;
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} updated successfully.`);
          this.refreshing=false;

        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.message);
          this.profileImage = null;
          this.refreshing=false;

        }
      )

    );
  }

  public updateProfileImage():void{
    this.clickButton('profile-image-input');
  }

  public onUpdateProfileImage():void{
    
    const formData=new FormData();
    formData.append('username',this.user.username);
    formData.append('profileImage',this.profileImage);
    
    this.subs.add(
      this.userService.updateProfileImage(formData).subscribe(
        (event: HttpEvent<any>) => {
          this.reportUploadProgress(event)
          this.refreshing=false;

        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.message);
          this.profileImage = null;
          this.refreshing=false;
          this.fileStatus.status='done';
        }
      )

    );
  }


  public onLogOut():void{
    this.authenticationService.logout();
    this.router.navigate(["/login"]);
    this.sendNotification(NotificationType.SUCCESS, `Logged out successfully.`);
  }

  public get isAdmin(): boolean {
    return this.getUserRole() === Role.ADMIN || this.getUserRole() === Role.SUPER_ADMIN;
  }

  public get isManager(): boolean {
    return this.isAdmin || this.getUserRole() === Role.MANAGER;
  }

  public get isAdminOrManager(): boolean {
    return this.isAdmin || this.isManager;
  }

  private getUserRole():string{
    return this.authenticationService.getUserFromLocalCache().role;

  }

  private reportUploadProgress(event:HttpEvent<any>):void{
    switch(event.type){
      case HttpEventType.UploadProgress:
        this.fileStatus.percentage=Math.round(100* event.loaded/event.total);
        this.fileStatus.status='progress';
        break;

      case HttpEventType.Response:
        if(event.status===200){
          this.user.profileImageUrl=`${event.body.profileImageUrl}?time=${new Date().getTime()}`
          this.sendNotification(NotificationType.SUCCESS, `${this.user.firstName}'s profile image updated successfully.`);
          this.fileStatus.status='done';
          break;
        }else{
          this.sendNotification(NotificationType.ERROR, `Unable to update image.Please try again`);
          break;
        }
      default:
        `Finished all progresses`;
    }
  }


  private clickButton(buttonId: string): void {
    document.getElementById(buttonId).click();
  }

  private sendNotification(notificationType: NotificationType, message: string): void {
    if (message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(notificationType, 'An error occured. Please try again.');
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}


