export function createSidebar() {

    return `

        <aside class="sidebar">

            <div class="logo">
                KAGE
            </div>

            <button
                id="newChatButton"
                type="button"
            >
                + New Chat
            </button>

            <div
                id="chatList"
                class="chatList"
            ></div>

            <div class="profileCard">

                <div class="avatar">
                    Y
                </div>

                <div class="profileText">

                    <small>
                        profile
                    </small>

                    <strong>
                        Yazan
                    </strong>

                </div>

            </div>

        </aside>

    `;

}
