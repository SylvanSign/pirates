defmodule Pirates.GameChannel do
  use Phoenix.Channel

  def join("game:lobby", _message, socket) do
    {:ok, socket}
  end
  def join("game:" <> _private_room_id, _params, _socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def handle_in("new_chatmsg", %{"body" => body, "user" => user}, socket) do
    broadcast! socket, "new_chatmsg", %{body: body, user: user}
    {:noreply, socket}
  end
end