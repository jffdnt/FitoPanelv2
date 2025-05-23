import * as React from "react";
import { useBoolean } from '@uifabric/react-hooks';
import * as ReactWebChat from 'botframework-webchat';
import { Panel, PanelType } from 'office-ui-fabric-react/lib/Panel';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Spinner } from 'office-ui-fabric-react/lib/Spinner';
import { Dispatch } from 'redux'
import { useRef } from "react";
import { Text } from 'office-ui-fabric-react/lib/Text';
import { Stack } from 'office-ui-fabric-react/lib/Stack';
import './ChatBotPanelOverrides.css';

import { IChatbotProps } from "./IChatBotProps";
import MSALWrapper from "./MSALWrapper";

export const PVAChatbotPanel: React.FunctionComponent<IChatbotProps> = (props) => {
    
    // Panel properties and states
    const [isOpen, { setTrue: openPanel, setFalse: dismissPanel }] = useBoolean(false);

    // Your bot's token endpoint
    const botURL = props.botURL;

    // constructing URL using regional settings
    const environmentEndPoint = botURL.slice(0,botURL.indexOf('/powervirtualagents'));
    const apiVersion = botURL.slice(botURL.indexOf('api-version')).split('=')[1];
    const regionalChannelSettingsURL = `${environmentEndPoint}/powervirtualagents/regionalchannelsettings?api-version=${apiVersion}`;

    // Using refs instead of IDs to get the webchat and loading spinner elements
    const webChatRef = useRef<HTMLDivElement>(null);
    const loadingSpinnerRef = useRef<HTMLDivElement>(null);

    // A utility function that extracts the OAuthCard resource URI from the incoming activity or return undefined
    function getOAuthCardResourceUri(activity: any): string | undefined {
        const attachment = activity?.attachments?.[0];
        if (attachment?.contentType === 'application/vnd.microsoft.card.oauth' && attachment.content.tokenExchangeResource) {
            return attachment.content.tokenExchangeResource.uri;
        }
    }

    const handlePanelOpen = async () => {
        
        const MSALWrapperInstance = new MSALWrapper(props.clientID, props.authority);

        // Trying to get token if user is already signed-in
        let responseToken = await MSALWrapperInstance.handleLoggedInUser([props.customScope], props.userEmail);

        if (!responseToken) {
            // Trying to get token if user is not signed-in
            responseToken = await MSALWrapperInstance.acquireAccessToken([props.customScope], props.userEmail);
        }

        const token = responseToken?.accessToken || null;

        // Get the regional channel URL
        let regionalChannelURL;

        const regionalResponse = await fetch(regionalChannelSettingsURL);
        if(regionalResponse.ok){
            const data = await regionalResponse.json();
            regionalChannelURL = data.channelUrlsById.directline;
        }
        else {
            console.error(`HTTP error! Status: ${regionalResponse.status}`);
        }


        // Create DirectLine object
        let directline: any;

        const response = await fetch(botURL);
        
        if (response.ok) {
            const conversationInfo = await response.json();
            directline = ReactWebChat.createDirectLine({
            token: conversationInfo.token,
            domain: regionalChannelURL + 'v3/directline',
        });
        } else {
        console.error(`HTTP error! Status: ${response.status}`);
        }

        const store = ReactWebChat.createStore(
            {},
               ({ dispatch }: { dispatch: Dispatch }) => (next: any) => (action: any) => {
                   
                // Checking whether we should greet the user
                if (props.greet)
                {
                    if (action.type === "DIRECT_LINE/CONNECT_FULFILLED") {
                        console.log("Action:" + action.type); 
                            dispatch({
                                meta: {
                                    method: "keyboard",
                                  },
                                    payload: {
                                      activity: {
                                              channelData: {
                                                  postBack: true,
                                              },
                                              //Web Chat will show the 'Greeting' System Topic message which has a trigger-phrase 'hello'
                                              name: 'startConversation',
                                              type: "event"
                                          },
                                  },
                                  type: "DIRECT_LINE/POST_ACTIVITY",
                              });
                              return next(action);
                          }
                    }
                    
                    // Checking whether the bot is asking for authentication
                    if (action.type === "DIRECT_LINE/INCOMING_ACTIVITY") {
                        const activity = action.payload.activity;
                        if (activity.from && activity.from.role === 'bot' &&
                        (getOAuthCardResourceUri(activity))){
                          directline.postActivity({
                            type: 'invoke',
                            name: 'signin/tokenExchange',
                            value: {
                              id: activity.attachments[0].content.tokenExchangeResource.id,
                              connectionName: activity.attachments[0].content.connectionName,
                              token
                            },
                            "from": {
                              id: props.userEmail,
                              name: props.userFriendlyName,
                              role: "user"
                            }
                                }).subscribe(
                                    (id: any) => {
                                      if(id === "retry"){
                                        // bot was not able to handle the invoke, so display the oauthCard (manual authentication)
                                        console.log("bot was not able to handle the invoke, so display the oauthCard")
                                            return next(action);
                                      }
                                    },
                                    (error: any) => {
                                      // an error occurred to display the oauthCard (manual authentication)
                                      console.log("An error occurred so display the oauthCard");
                                          return next(action);
                                    }
                                  )
                                // token exchange was successful, do not show OAuthCard
                                return;
                        }
                      } else {
                        return next(action);
                      }
                    
                    return next(action);
                }
            );

            // hide the upload button - other style options can be added here
            const canvasStyleOptions = {
                hideUploadButton: true,
                botAvatarImage: 'https://freepngimg.com/thumb/dog/163165-puppy-dog-face-free-transparent-image-hd.png',
                botAvatarBackgroundColor: 'white',
                botAvatarInitials: 'FT',
                userAvatarImage: 'https://zetaphotoservice.azurewebsites.net/microsoft/photo/' + props.userEmail,
                userAvatarBackgroundColor: 'white',
                userAvatarInitials: 'JD',
            }
        
            // Render webchat
            if (token && directline) {
                if (webChatRef.current && loadingSpinnerRef.current) {
                    webChatRef.current.style.minHeight = '50vh';
                    loadingSpinnerRef.current.style.display = 'none';
                    ReactWebChat.renderWebChat(
                        {
                            directLine: directline,
                            store: store,
                            styleOptions: canvasStyleOptions,
                            userID: props.userEmail,
                        },
                    webChatRef.current
                    );
                } else {
                    console.error("Webchat or loading spinner not found");
                }
        }

    };

    return (
        <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            position: "fixed",
            top: "75%",
            right: "0",
            transform: "translateY(-50%)",
            zIndex: 1000,
            marginRight: "15px"
        }}>
            <DefaultButton 
                secondaryText={props.buttonLabel} 
                text=""
                onClick={openPanel}
                iconProps={{ iconName: 'Message' }}
                styles={{
                    root: {
                        backgroundColor: '#0057B8',
                        color: 'white',
                        borderRadius: '10px',
                        border: 'none',
                        padding: '16px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: '80px'
                    },
                    rootHovered: {
                        backgroundColor: '#009FDB',
                        color: 'white',
                        borderRadius: '10px',
                        border: 'none',
                        padding: '16px 16px'
                    },
                    rootPressed: {
                        backgroundColor: '#009FDB',
                        color: 'white',
                        borderRadius: '10px',
                        border: 'none',
                        padding: '16px 16px'
                    },
                    label: { display: 'none' },
                    icon: {
                        marginRight: '8px',
                        color: 'white',
                        fontSize: '28px'
                    }
                }}
            >
                <Stack tokens={{ childrenGap: 1 }} verticalAlign="center" styles={{ root: { padding: '3px 3px' } }}>
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 'bold', color: 'white', lineHeight: '1.2' } }}>CHAT</Text>
                    <Text variant="mediumPlus" styles={{ root: { color: 'white', lineHeight: '1.2' } }}>with</Text>
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 'bold', color: 'white', lineHeight: '1.2' } }}>FiTo</Text>
                </Stack>
            </DefaultButton>
            <Panel
                onRenderHeader={() => (
                  <div style={{
                    background: '#0057B8',
                    color: 'white',
                    padding: '16px 24px',
                    margin: 0
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold' }}>{props.botName}</span>
                  </div>
                )}
                isOpen={isOpen}
                onDismiss={dismissPanel}
                onOpen={handlePanelOpen}
                isLightDismiss={true}
                closeButtonAriaLabel="Close"
                type={PanelType.smallFixedFar}
                styles={{
                    header: { paddingTop: 0, marginTop: 0 },
                    contentInner: { padding: '0px', height: '100%' }
                }}
            >
                <div id="chatContainer" style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    height: "100%",
                    minHeight: "400px",
                    flex: 1
                }}>
                    <div ref={webChatRef} role="main" style={{ flex: 1, width: "100%", minHeight: 0, height: '100%' }}></div>
                    <div ref={loadingSpinnerRef}><Spinner label="Loading..." style={{ paddingTop: "1rem", paddingBottom: "1rem" }} /></div>
                </div>
            </Panel>
        </div>
    );
};

export default class ChatbotPanel extends React.Component<IChatbotProps> {
    constructor(props: IChatbotProps) {
        super(props);
    }
    public render(): JSX.Element {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "1rem" }}>
                <PVAChatbotPanel
                {...this.props}/>
            </div>
        );
    }
}  
